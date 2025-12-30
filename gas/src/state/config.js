// Avoid evaluating require() at load time (Apps Script has no require and file order is not guaranteed).
function _getScriptPropertyKeys() {
  if (typeof SCRIPT_PROPERTY_KEYS !== 'undefined') return SCRIPT_PROPERTY_KEYS;
  if (typeof require !== 'undefined') return require('./keys').SCRIPT_PROPERTY_KEYS;
  throw new Error('SCRIPT_PROPERTY_KEYS is not available');
}

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
  const keys = _getScriptPropertyKeys();

  const locationHistoryFileId =
    (store.getProperty(keys.LOCATION_HISTORY_FILE_ID) || '').trim() || null;

  // Backward-compat: if no file-id is provided, allow folder scan mode.
  const takeoutFolderIdRaw =
    (store.getProperty(keys.TAKEOUT_FOLDER_ID) || '').trim() || null;
  const takeoutFolderId = locationHistoryFileId
    ? null
    : requireNonEmpty(takeoutFolderIdRaw, `Missing Script Property: ${keys.TAKEOUT_FOLDER_ID}`);
  const outputFolderId = requireNonEmpty(
    store.getProperty(keys.OUTPUT_FOLDER_ID),
    `Missing Script Property: ${keys.OUTPUT_FOLDER_ID}`
  );

  const maxRouteRequestsPerDay = parsePositiveInt(
    store.getProperty(keys.MAX_ROUTE_REQUESTS_PER_DAY),
    0
  );

  const logSheetId = (store.getProperty(keys.LOG_SHEET_ID) || '').trim() || null;
  const startDate = (store.getProperty(keys.START_DATE) || '').trim() || null;
  const endDate = (store.getProperty(keys.END_DATE) || '').trim() || null;

  return {
    locationHistoryFileId,
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


