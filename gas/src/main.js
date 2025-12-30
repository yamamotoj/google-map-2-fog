// NOTE:
// This file is meant to run in Apps Script. Do not use require() here.
// All referenced functions are provided by other pushed .gs files in the same project.

function millisNow() {
  return Date.now();
}

function computeStopAt({ maxMillis = 5 * 60 * 1000, safetyMillis = 20 * 1000 } = {}) {
  return millisNow() + Math.max(0, maxMillis - safetyMillis);
}

function isTimeUp(stopAtMillis) {
  return millisNow() >= stopAtMillis;
}

function processOneDay({ config, logger, run, jobState, stopAtMillis }) {
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

  const file = DriveApp.getFileById(config.locationHistoryFileId);

  // Fast path for iPhone export JSON (top-level array): avoid parsing the full array.
  const text = readDriveTextFile(file);
  const trimmed = String(text).trimStart();
  const dayPoints = trimmed.startsWith('[')
    ? normalizeIphoneDayPointsFromJsonText(text, targetDate)
    : (() => {
        // Fallback: takeout-like object JSON
        const json = JSON.parse(text);
        const pts = normalizeFromTakeoutJson(json);
        return filterPointsByJstDate(pts, targetDate);
      })();

  run.processedDates.push(targetDate);

  if (dayPoints.length === 0) {
    logger.info('no points for date (skip export)', { date: targetDate });
  } else {
    const result = exportDailyGpxToDrive({
      outputFolderId: config.outputFolderId,
      date: targetDate,
      points: dayPoints
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

    const stopAtMillis = computeStopAt();
    const { completed } = processOneDay({ config, logger, run, jobState, stopAtMillis });
    if (completed) {
      saveJobState(jobState);
    } else {
      // Save cursor/lastRunAt but do not advance day if incomplete
      saveJobState(jobState);
    }

    logger.info('manualRun completed', { runId: run.runId, completed });
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


