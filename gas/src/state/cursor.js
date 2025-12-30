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
  d.setDate(d.getDate() + days);
  return _resolveFormatJstDate()(d);
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


