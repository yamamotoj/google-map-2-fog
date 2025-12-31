// NOTE:
// This file is meant to run in Apps Script. Do not use require() here.
// All referenced functions are provided by other pushed .gs files in the same project.

function millisNow() {
  return Date.now();
}

// NOTE:
// Apps Script hard timeout can be ~6 minutes depending on account type.
// We keep a safety margin to ensure state is saved before hard timeout.
function computeStopAt({ maxMillis = 5 * 60 * 1000, safetyMillis = 15 * 1000 } = {}) {
  return millisNow() + Math.max(0, maxMillis - safetyMillis);
}

function isTimeUp(stopAtMillis) {
  return millisNow() >= stopAtMillis;
}

function _resolveFileNameHelpers() {
  const ensureStart = typeof ensureStartDateInFileName !== 'undefined'
    ? ensureStartDateInFileName
    : (typeof require !== 'undefined' ? require('./gpx/fileName').ensureStartDateInFileName : null);
  const buildYearly = typeof buildYearlyOutputFileName !== 'undefined'
    ? buildYearlyOutputFileName
    : (typeof require !== 'undefined' ? require('./gpx/fileName').buildYearlyOutputFileName : null);
  if (!ensureStart || !buildYearly) throw new Error('fileName helpers are not available');
  return { ensureStart, buildYearly };
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
    return { completed: false, reason: 'TIME_BUDGET' };
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
    const { ensureStart, buildYearly } = _resolveFileNameHelpers();
    const year = String(targetDate).slice(0, 4);

    const outputFileName = mode === 'yearly'
      ? (config.outputFileName || 'timeline.gpx') // template; Drive側で「既存の年ファイルがあればそれ」を優先
      : ensureStart((config.outputFileName || 'timeline-all.gpx'), config.startDate);

    const result =
      mode === 'single' || mode === 'yearly'
        ? appendDayGpxToDrive({
            outputFolderId: config.outputFolderId,
            outputFileName,
            outputMode: mode,
            startDate: config.startDate,
            date: targetDate,
            points: exportPoints,
            breakDistanceMeters: config.gpxBreakDistanceMeters
          })
        : exportDailyGpxToDrive({
            outputFolderId: config.outputFolderId,
            date: targetDate,
            points: exportPoints,
            breakDistanceMeters: config.gpxBreakDistanceMeters
          });
    if (!result.skipped) {
      run.exportedFiles.push({ date: targetDate, fileId: result.fileId });
    }
  }

  jobState.cursor.nextDateToProcess = addDaysJst(targetDate, 1);
  return { completed: true, reason: 'OK' };
}

function _maybeScheduleRetry({ allowRetry, logger, config, jobState, minutesFromNow = 2 }) {
  if (!allowRetry) return false;
  // If route enrichment is enabled, only retry while today's route budget remains.
  if (config?.enableRouteEnrichment && jobState && !canConsumeRouteRequest(jobState)) {
    return false;
  }
  try {
    // retryRun is a separate handler to avoid deleting the daily scheduledRun trigger.
    createOneTimeTrigger('retryRun', { minutesFromNow });
    logger.info('scheduled retry trigger', { handler: 'retryRun', minutesFromNow });
    return true;
  } catch (e) {
    logger.warn('failed to schedule retry trigger', { error: String(e?.message || e) });
    return false;
  }
}

/**
 * Manual entrypoint (run from Apps Script editor).
 * This will be wired later to the full pipeline (US1+).
 */
function _runCore({ allowRetry } = {}) {
  const config = loadConfig();
  const { logger, startRun, endRun } = createRunLogger({ logSheetId: config.logSheetId });

  let run = startRun();
  logger.info('run started', { runId: run.runId, allowRetry: Boolean(allowRetry) });
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
    let scheduledRetry = false;
    while (true) {
      if (shouldStopAtEndDate(jobState, { endDate: config.endDate })) break;
      if (isTimeUp(stopAtMillis)) {
        completed = false;
        logger.warn('time budget reached; stopping run', { date: jobState.cursor.nextDateToProcess });
        scheduledRetry = _maybeScheduleRetry({ allowRetry, logger, config, jobState });
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
      if (!completed) {
        if (res.reason === 'TIME_BUDGET') {
          scheduledRetry = _maybeScheduleRetry({ allowRetry, logger, config, jobState });
        }
        break;
      }
      daysProcessedThisRun++;
    }

    logger.info('run completed', { runId: run.runId, completed, daysProcessedThisRun, scheduledRetry });
  } catch (e) {
    run.errors.push({ kind: e.code || 'ERROR', message: String(e.message || e) });
    logger.error('run failed', { runId: run.runId, error: String(e.message || e) });
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

function manualRun() {
  // Manual run should not create additional triggers.
  return _runCore({ allowRetry: false });
}

/**
 * Scheduled entrypoint (time-driven trigger).
 */
function scheduledRun() {
  return _runCore({ allowRetry: true });
}

/**
 * One-time retry handler (created automatically when time budget is reached).
 */
function retryRun() {
  return _runCore({ allowRetry: true });
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
globalThis.retryRun = retryRun;
globalThis.installDailyTrigger = installDailyTrigger;
globalThis.uninstallDailyTrigger = uninstallDailyTrigger;

if (typeof module !== 'undefined') {
  module.exports = { manualRun, scheduledRun, installDailyTrigger, uninstallDailyTrigger };
}


