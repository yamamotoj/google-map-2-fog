const { SCRIPT_PROPERTY_KEYS } = require('./keys');
const { getPropertyStore } = require('./config');

const JOB_STATE_VERSION = 1;

function defaultJobState({ startDate } = {}) {
  return {
    version: JOB_STATE_VERSION,
    cursor: {
      nextDateToProcess: startDate || null,
      lastRunAt: null
    },
    budget: {
      maxRouteRequestsPerDay: 0,
      routeRequestsUsedToday: 0,
      lastBudgetResetDate: null
    },
    outputs: {
      exportedDates: []
    }
  };
}

function loadJobState() {
  const store = getPropertyStore();
  const raw = store.getProperty(SCRIPT_PROPERTY_KEYS.JOB_STATE);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (e) {
    const err = new Error('JOB_STATE is not valid JSON');
    err.code = 'JOB_STATE_INVALID';
    throw err;
  }
}

function saveJobState(state) {
  const store = getPropertyStore();
  store.setProperty(SCRIPT_PROPERTY_KEYS.JOB_STATE, JSON.stringify(state));
}

function loadOrInitJobState({ startDate } = {}) {
  const existing = loadJobState();
  if (existing) return existing;
  const init = defaultJobState({ startDate });
  saveJobState(init);
  return init;
}

if (typeof module !== 'undefined') {
  module.exports = { JOB_STATE_VERSION, defaultJobState, loadJobState, saveJobState, loadOrInitJobState };
}


