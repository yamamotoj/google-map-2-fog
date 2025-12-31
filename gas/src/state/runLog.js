function isoNow() {
  return new Date().toISOString();
}

function createConsoleLogger() {
  return {
    info: (msg, ctx) => console.log(`[INFO] ${msg}`, ctx || ''),
    warn: (msg, ctx) => console.log(`[WARN] ${msg}`, ctx || ''),
    error: (msg, ctx) => console.log(`[ERROR] ${msg}`, ctx || '')
  };
}

function createSpreadsheetLogger(sheetId) {
  if (!sheetId) return null;
  if (typeof SpreadsheetApp === 'undefined') return null;
  try {
    const ss = SpreadsheetApp.openById(sheetId);
    const sheet = ss.getSheets()[0];
    return {
      info: (msg, ctx) => sheet.appendRow([isoNow(), 'INFO', msg, JSON.stringify(ctx || {})]),
      warn: (msg, ctx) => sheet.appendRow([isoNow(), 'WARN', msg, JSON.stringify(ctx || {})]),
      error: (msg, ctx) => sheet.appendRow([isoNow(), 'ERROR', msg, JSON.stringify(ctx || {})])
    };
  } catch (e) {
    // Fall back to console logger
    return null;
  }
}

function createRunLogger({ logSheetId } = {}) {
  const consoleLogger = createConsoleLogger();
  const sheetLogger = createSpreadsheetLogger(logSheetId);
  const logger = sheetLogger || consoleLogger;

  return {
    logger,
    startRun: () => ({
      runId: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      startedAt: isoNow(),
      processedDates: [],
      exportedFiles: [],
      routeRequestsUsed: 0,
      errors: []
    }),
    endRun: (runLog) => ({ ...runLog, endedAt: isoNow() })
  };
}

if (typeof module !== 'undefined') {
  module.exports = { createRunLogger };
}


