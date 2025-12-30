/**
 * Parse a Drive file as JSON (Apps Script only).
 */
function parseDriveJsonFile(file) {
  const name = file.getName?.() || '(unknown)';
  try {
    const text = file.getBlob().getDataAsString('UTF-8');
    return JSON.parse(text);
  } catch (e) {
    const err = new Error(`Failed to parse JSON: ${name}`);
    err.code = 'TAKEOUT_JSON_PARSE_ERROR';
    err.cause = e;
    throw err;
  }
}

if (typeof module !== 'undefined') {
  module.exports = { parseDriveJsonFile };
}


