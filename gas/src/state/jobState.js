function _resolveScriptPropertyKeys() {
  if (typeof SCRIPT_PROPERTY_KEYS !== 'undefined') return SCRIPT_PROPERTY_KEYS;
  if (typeof require !== 'undefined') return require('./keys').SCRIPT_PROPERTY_KEYS;
  throw new Error('SCRIPT_PROPERTY_KEYS is not available');
}

function _resolveGetPropertyStore() {
  if (typeof getPropertyStore !== 'undefined') return getPropertyStore;
  if (typeof require !== 'undefined') return require('./config').getPropertyStore;
  throw new Error('getPropertyStore is not available');
}

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
  const store = _resolveGetPropertyStore()();
  const keys = _resolveScriptPropertyKeys();
  const raw = store.getProperty(keys.JOB_STATE);
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
  const store = _resolveGetPropertyStore()();
  const keys = _resolveScriptPropertyKeys();
  store.setProperty(keys.JOB_STATE, JSON.stringify(state));
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


