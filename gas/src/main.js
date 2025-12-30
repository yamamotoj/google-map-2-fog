const { loadConfig } = require('./state/config');
const { createRunLogger } = require('./state/runLog');
const { loadOrInitJobState, saveJobState } = require('./state/jobState');
const { ensureBudgetReset, setMaxRouteRequestsPerDay } = require('./state/budget');
const { listJsonFilesRecursive } = require('./takeout/discovery');
const { parseDriveJsonFile } = require('./takeout/parser');
const { normalizeFromTakeoutJson } = require('./takeout/normalize');
const { filterPointsByJstDate } = require('./takeout/partition');
const { exportDailyGpxToDrive } = require('./gpx/exportToDrive');
const { addDaysJst, ensureCursorInitialized, shouldStopAtEndDate } = require('./state/cursor');
const { createDailyTrigger, deleteTriggersForHandler } = require('./state/triggers');

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

  const files = listJsonFilesRecursive(config.takeoutFolderId);
  logger.info('discovered takeout files', { count: files.length });

  const dayPoints = [];
  for (const f of files) {
    if (isTimeUp(stopAtMillis)) {
      logger.warn('time budget reached; stopping early', { date: targetDate });
      return { completed: false };
    }

    try {
      const json = parseDriveJsonFile(f);
      const pts = normalizeFromTakeoutJson(json);
      const filtered = filterPointsByJstDate(pts, targetDate);
      if (filtered.length) dayPoints.push(...filtered);
    } catch (e) {
      run.errors.push({ kind: e.code || 'TAKEOUT_ERROR', message: String(e.message || e), context: { fileName: f.getName?.() } });
      logger.warn('skipped takeout file', { fileName: f.getName?.(), error: String(e.message || e) });
    }
  }

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


