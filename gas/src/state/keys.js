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
  OUTPUT_MODE: 'OUTPUT_MODE', // 'daily' (default) | 'single'
  OUTPUT_FILE_NAME: 'OUTPUT_FILE_NAME', // used when OUTPUT_MODE='single' (default: timeline-all.gpx)
  GPX_BREAK_DISTANCE_METERS: 'GPX_BREAK_DISTANCE_METERS', // break trkseg if distance between points exceeds this (default: 2000)
  MAX_ROUTE_REQUESTS_PER_DAY: 'MAX_ROUTE_REQUESTS_PER_DAY',
  // Routes (US2)
  MAPS_API_KEY: 'MAPS_API_KEY',
  ENABLE_ROUTE_ENRICHMENT: 'ENABLE_ROUTE_ENRICHMENT', // '1' to enable
  ROUTE_TRAVEL_MODE: 'ROUTE_TRAVEL_MODE', // driving|walking|bicycling|transit
  ROUTE_MIN_DISTANCE_METERS: 'ROUTE_MIN_DISTANCE_METERS', // default 200
  ENABLE_ROUTE_MODE_AUTO: 'ENABLE_ROUTE_MODE_AUTO', // '1' to enable
  ROUTE_MODE_AUTO_FALLBACK: 'ROUTE_MODE_AUTO_FALLBACK', // driving|walking|bicycling|transit (default driving)

  // Heuristics
  FLIGHT_MIN_DISTANCE_METERS: 'FLIGHT_MIN_DISTANCE_METERS', // default 50000
  FLIGHT_MAX_DURATION_HOURS: 'FLIGHT_MAX_DURATION_HOURS', // default 0 (no limit)
  FLIGHT_MIN_SPEED_KMH: 'FLIGHT_MIN_SPEED_KMH', // default 200

  // Run control
  LOG_SHEET_ID: 'LOG_SHEET_ID',
  START_DATE: 'START_DATE',
  END_DATE: 'END_DATE',
  JOB_STATE: 'JOB_STATE'
});

if (typeof module !== 'undefined') {
  module.exports = { SCRIPT_PROPERTY_KEYS };
}


