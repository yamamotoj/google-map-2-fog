const { SCRIPT_PROPERTY_KEYS } = require('./keys');

function getPropertyStore() {
  // Apps Script environment
  if (typeof PropertiesService !== 'undefined') {
    return PropertiesService.getScriptProperties();
  }
  // Local test/dev environment
  return {
    getProperty: (k) => process.env[k] ?? null,
    setProperty: (k, v) => {
      process.env[k] = String(v);
    }
  };
}

function requireNonEmpty(value, message) {
  if (value == null || String(value).trim() === '') {
    const err = new Error(message);
    err.code = 'CONFIG_MISSING';
    throw err;
  }
  return String(value).trim();
}

function parsePositiveInt(value, fallback) {
  if (value == null || String(value).trim() === '') return fallback;
  const n = Number.parseInt(String(value), 10);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return n;
}

function loadConfig() {
  const store = getPropertyStore();

  const takeoutFolderId = requireNonEmpty(
    store.getProperty(SCRIPT_PROPERTY_KEYS.TAKEOUT_FOLDER_ID),
    `Missing Script Property: ${SCRIPT_PROPERTY_KEYS.TAKEOUT_FOLDER_ID}`
  );
  const outputFolderId = requireNonEmpty(
    store.getProperty(SCRIPT_PROPERTY_KEYS.OUTPUT_FOLDER_ID),
    `Missing Script Property: ${SCRIPT_PROPERTY_KEYS.OUTPUT_FOLDER_ID}`
  );

  const maxRouteRequestsPerDay = parsePositiveInt(
    store.getProperty(SCRIPT_PROPERTY_KEYS.MAX_ROUTE_REQUESTS_PER_DAY),
    0
  );

  const logSheetId = (store.getProperty(SCRIPT_PROPERTY_KEYS.LOG_SHEET_ID) || '').trim() || null;
  const startDate = (store.getProperty(SCRIPT_PROPERTY_KEYS.START_DATE) || '').trim() || null;
  const endDate = (store.getProperty(SCRIPT_PROPERTY_KEYS.END_DATE) || '').trim() || null;

  return {
    takeoutFolderId,
    outputFolderId,
    maxRouteRequestsPerDay,
    logSheetId,
    startDate,
    endDate
  };
}

if (typeof module !== 'undefined') {
  module.exports = { loadConfig, getPropertyStore, parsePositiveInt, requireNonEmpty };
}


