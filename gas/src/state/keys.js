/**
 * Script Properties keys (single source of truth).
 *
 * NOTE: In Apps Script, store secrets like Maps API key here by key-name only,
 * and keep actual values in Script Properties (never commit secrets).
 */

const SCRIPT_PROPERTY_KEYS = Object.freeze({
  // Input (preferred): Drive file ID for location-history.json (iPhone timeline export)
  LOCATION_HISTORY_FILE_ID: 'LOCATION_HISTORY_FILE_ID',

  // Backward-compat (deprecated): folder recursive scan (old approach)
  TAKEOUT_FOLDER_ID: 'TAKEOUT_FOLDER_ID',

  OUTPUT_FOLDER_ID: 'OUTPUT_FOLDER_ID',
  MAX_ROUTE_REQUESTS_PER_DAY: 'MAX_ROUTE_REQUESTS_PER_DAY',
  LOG_SHEET_ID: 'LOG_SHEET_ID',
  START_DATE: 'START_DATE',
  END_DATE: 'END_DATE',
  JOB_STATE: 'JOB_STATE'
});

if (typeof module !== 'undefined') {
  module.exports = { SCRIPT_PROPERTY_KEYS };
}


