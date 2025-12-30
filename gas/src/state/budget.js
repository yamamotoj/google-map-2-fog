function formatJstDate(date) {
  // Apps Script Utilities.formatDate is available in GAS; in local tests, fall back to UTC date.
  if (typeof Utilities !== 'undefined' && typeof Utilities.formatDate === 'function') {
    return Utilities.formatDate(date, 'Asia/Tokyo', 'yyyy-MM-dd');
  }
  return date.toISOString().slice(0, 10);
}

function ensureBudgetReset(jobState, { now = new Date() } = {}) {
  const today = formatJstDate(now);
  if (jobState.budget.lastBudgetResetDate !== today) {
    jobState.budget.lastBudgetResetDate = today;
    jobState.budget.routeRequestsUsedToday = 0;
  }
  return jobState;
}

function setMaxRouteRequestsPerDay(jobState, max) {
  jobState.budget.maxRouteRequestsPerDay = Math.max(0, Number.parseInt(String(max), 10) || 0);
  return jobState;
}

function canConsumeRouteRequest(jobState) {
  return jobState.budget.routeRequestsUsedToday < jobState.budget.maxRouteRequestsPerDay;
}

function consumeRouteRequest(jobState, count = 1) {
  const c = Math.max(0, Number.parseInt(String(count), 10) || 0);
  jobState.budget.routeRequestsUsedToday += c;
  return jobState;
}

if (typeof module !== 'undefined') {
  module.exports = { ensureBudgetReset, setMaxRouteRequestsPerDay, canConsumeRouteRequest, consumeRouteRequest, formatJstDate };
}


