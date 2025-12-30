function _resolveFormatJstDate() {
  if (typeof formatJstDate !== 'undefined') return formatJstDate;
  if (typeof require !== 'undefined') return require('./budget').formatJstDate;
  throw new Error('formatJstDate is not available');
}

function parseJstYyyyMmDd(dateStr) {
  // Interpret as JST midnight
  return new Date(`${dateStr}T00:00:00+09:00`);
}

function addDaysJst(dateStr, days) {
  const d = parseJstYyyyMmDd(dateStr);
  if (Number.isNaN(d.getTime())) {
    const err = new Error(`Invalid date: ${dateStr}`);
    err.code = 'INVALID_DATE';
    throw err;
  }
  // IMPORTANT:
  // Do NOT use setDate()/getDate() here because they are affected by the project's timezone/DST.
  // (e.g. 2011-03-13 can get stuck in some DST zones.)
  // We treat dateStr as JST midnight and advance by whole days in milliseconds.
  const dayMs = 24 * 60 * 60 * 1000;
  const next = new Date(d.getTime() + dayMs * Number(days || 0));
  return _resolveFormatJstDate()(next);
}

function ensureCursorInitialized(jobState, { startDate } = {}) {
  if (!jobState.cursor.nextDateToProcess) {
    if (!startDate) {
      const err = new Error('START_DATE is required to initialize cursor (Script Property START_DATE)');
      err.code = 'START_DATE_REQUIRED';
      throw err;
    }
    jobState.cursor.nextDateToProcess = startDate;
  }
  return jobState;
}

function shouldStopAtEndDate(jobState, { endDate } = {}) {
  if (!endDate) return false;
  const next = jobState.cursor.nextDateToProcess;
  return Boolean(next && next > endDate);
}

if (typeof module !== 'undefined') {
  module.exports = { addDaysJst, ensureCursorInitialized, shouldStopAtEndDate };
}


