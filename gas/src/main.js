// NOTE:
// This file is meant to run in Apps Script. Do not use require() here.
// All referenced functions are provided by other pushed .gs files in the same project.

function millisNow() {
  return Date.now();
}

// NOTE:
// Apps Script execution limits vary by account type. This project targets up to ~20 min runs.
// We keep a safety margin to ensure state is saved before hard timeout.
function computeStopAt({ maxMillis = 20 * 60 * 1000, safetyMillis = 60 * 1000 } = {}) {
  return millisNow() + Math.max(0, maxMillis - safetyMillis);
}

function isTimeUp(stopAtMillis) {
  return millisNow() >= stopAtMillis;
}

function _buildDayPointsProvider({ config, file }) {
  // Read once per execution; reuse for multiple days.
  const text = readDriveTextFile(file);
  const trimmed = String(text).trimStart();

  if (trimmed.startsWith('[')) {
    // iPhone export JSON (top-level array)
    return (date) => normalizeIphoneDayPointsFromJsonText(text, date);
  }

  // Fallback: takeout-like object JSON (parse+normalize once)
  const json = JSON.parse(text);
  const pts = normalizeFromTakeoutJson(json);
  return (date) => filterPointsByJstDate(pts, date);
}

function processOneDay({ config, logger, run, jobState, stopAtMillis, getDayPoints }) {
  const targetDate = jobState.cursor.nextDateToProcess;
  logger.info('processing date', { date: targetDate });

  if (isTimeUp(stopAtMillis)) {
    logger.warn('time budget reached; stopping early', { date: targetDate });
    return { completed: false };
  }

  if (!config.locationHistoryFileId) {
    const err = new Error('Missing Script Property: LOCATION_HISTORY_FILE_ID (Drive file id for location-history.json)');
    err.code = 'CONFIG_MISSING';
    throw err;
  }

  const dayPoints = getDayPoints(targetDate);

  run.processedDates.push(targetDate);

  if (dayPoints.length === 0) {
    logger.info('no points for date (skip export)', { date: targetDate });
  } else {
    let exportPoints = dayPoints;

    // US2: route enrichment (optional, failsafe)
    if (config.enableRouteEnrichment) {
      try {
        const before = exportPoints.length;
        const enriched = enrichPointsWithRoutes({ points: exportPoints, config, jobState, logger });
        if (enriched.stoppedDueToBudget) {
          run.routeRequestsUsed = jobState.budget.routeRequestsUsedToday;
          logger.warn('route budget exhausted; stopping run before export', {
            date: targetDate,
            maxRouteRequestsPerDay: jobState.budget.maxRouteRequestsPerDay,
            routeRequestsUsedToday: jobState.budget.routeRequestsUsedToday
          });
          return { completed: false, reason: 'BUDGET_EXHAUSTED' };
        }
        exportPoints = enriched.points;
        run.routeRequestsUsed = jobState.budget.routeRequestsUsedToday;
        logger.info('route enrichment stats', {
          date: targetDate,
          beforePoints: before,
          afterPoints: exportPoints.length,
          ...enriched.stats
        });
      } catch (e) {
        logger.warn('route enrichment failed; fallback to points only', {
          date: targetDate,
          error: String(e?.message || e),
          code: e?.code || null
        });
      }
    }

    const mode = String(config.outputMode || 'daily').toLowerCase();
    const result = mode === 'single'
      ? appendDayGpxToDrive({
          outputFolderId: config.outputFolderId,
          outputFileName: config.outputFileName,
          date: targetDate,
          points: exportPoints
        })
      : exportDailyGpxToDrive({
          outputFolderId: config.outputFolderId,
          date: targetDate,
          points: exportPoints
        });
    if (!result.skipped) {
      run.exportedFiles.push({ date: targetDate, fileId: result.fileId });
    }
  }

  jobState.cursor.nextDateToProcess = addDaysJst(targetDate, 1);
  return { completed: true };
}

/**
 * Manual entrypoint (run from Apps Script editor).
 * This will be wired later to the full pipeline (US1+).
 */
function manualRun() {
  const config = loadConfig();
  const { logger, startRun, endRun } = createRunLogger({ logSheetId: config.logSheetId });

  let run = startRun();
  logger.info('manualRun started', { runId: run.runId });
  let jobState = null;

  try {
    jobState = loadOrInitJobState({ startDate: config.startDate });
    ensureBudgetReset(jobState);
    setMaxRouteRequestsPerDay(jobState, config.maxRouteRequestsPerDay);
    ensureCursorInitialized(jobState, { startDate: config.startDate });
    jobState.cursor.lastRunAt = new Date().toISOString();
    saveJobState(jobState);

    if (shouldStopAtEndDate(jobState, { endDate: config.endDate })) {
      logger.info('end date reached; nothing to do', { nextDateToProcess: jobState.cursor.nextDateToProcess, endDate: config.endDate });
      return;
    }

    // NOTE: Apps Script execution has hard limits. We keep a fixed safety stop.
    // Run length is controlled by MAX_ROUTE_REQUESTS_PER_DAY (budget) rather than extra knobs.
    const stopAtMillis = computeStopAt();

    const file = DriveApp.getFileById(config.locationHistoryFileId);
    const getDayPoints = _buildDayPointsProvider({ config, file });

    let daysProcessedThisRun = 0;
    let completed = true;
    while (true) {
      if (shouldStopAtEndDate(jobState, { endDate: config.endDate })) break;
      if (isTimeUp(stopAtMillis)) {
        completed = false;
        logger.warn('time budget reached; stopping run', { date: jobState.cursor.nextDateToProcess });
        break;
      }

      // If route enrichment is enabled, stop the whole run once daily budget is exhausted.
      if (config.enableRouteEnrichment && !canConsumeRouteRequest(jobState)) {
        completed = false;
        logger.warn('route budget exhausted; stopping run', {
          date: jobState.cursor.nextDateToProcess,
          maxRouteRequestsPerDay: jobState.budget.maxRouteRequestsPerDay,
          routeRequestsUsedToday: jobState.budget.routeRequestsUsedToday
        });
        break;
      }

      const res = processOneDay({ config, logger, run, jobState, stopAtMillis, getDayPoints });
      completed = res.completed;
      // Always persist progress after each attempt (safe resume)
      saveJobState(jobState);
      if (!completed) break;
      daysProcessedThisRun++;
    }

    logger.info('manualRun completed', { runId: run.runId, completed, daysProcessedThisRun });
  } catch (e) {
    run.errors.push({ kind: e.code || 'ERROR', message: String(e.message || e) });
    logger.error('manualRun failed', { runId: run.runId, error: String(e.message || e) });
    throw e;
  } finally {
    try {
      // Always persist lastRunAt even when errors happen, so we can see activity.
      // Cursor is only advanced on successful completion inside processOneDay.
      // jobState is already saved in the normal path; this is a safety net.
      // (Best-effort; never override the main error.)
      if (jobState) saveJobState(jobState);
    } catch (_) {
      // ignore
    }
    run = endRun(run);
    logger.info('run summary', run);
  }
}

/**
 * Scheduled entrypoint (time-driven trigger).
 */
function scheduledRun() {
  // For now, reuse manual behavior.
  return manualRun();
}

/**
 * Create daily trigger for scheduledRun at given hour (default 3AM JST).
 */
function installDailyTrigger(hour) {
  createDailyTrigger('scheduledRun', { hour: typeof hour === 'number' ? hour : 3 });
}

function uninstallDailyTrigger() {
  deleteTriggersForHandler('scheduledRun');
}

// Expose functions for Apps Script runtime
globalThis.manualRun = manualRun;
globalThis.scheduledRun = scheduledRun;
globalThis.installDailyTrigger = installDailyTrigger;
globalThis.uninstallDailyTrigger = uninstallDailyTrigger;

if (typeof module !== 'undefined') {
  module.exports = { manualRun, scheduledRun, installDailyTrigger, uninstallDailyTrigger };
}


