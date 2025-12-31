/**
 * Parse a Drive file as JSON (Apps Script only).
 */
function parseDriveJsonFile(file) {
  const name = file.getName?.() || '(unknown)';
  try {
    const text = readDriveTextFile(file);
    return JSON.parse(text);
  } catch (e) {
    const err = new Error(`Failed to parse JSON: ${name}`);
    err.code = 'TAKEOUT_JSON_PARSE_ERROR';
    err.cause = e;
    throw err;
  }
}

/**
 * Read a Drive file as UTF-8 text (Apps Script only).
 */
function readDriveTextFile(file) {
  const name = file.getName?.() || '(unknown)';
  try {
    return file.getBlob().getDataAsString('UTF-8');
  } catch (e) {
    const err = new Error(`Failed to read file as text: ${name}`);
    err.code = 'DRIVE_TEXT_READ_ERROR';
    err.cause = e;
    throw err;
  }
}

/**
 * Iterate objects inside a top-level JSON array without parsing the full array at once.
 * Calls onObjectString(objJsonText) for each element object literal.
 *
 * Constraints:
 * - Assumes the top-level JSON is an array whose elements are objects ({...}).
 * - Handles nested objects/arrays and quoted strings/escapes.
 */
function iterateJsonArrayObjectStrings(text, onObjectString) {
  if (typeof text !== 'string') throw new Error('iterateJsonArrayObjectStrings: text must be a string');
  if (typeof onObjectString !== 'function') throw new Error('iterateJsonArrayObjectStrings: onObjectString must be a function');

  const len = text.length;
  let i = 0;

  function isWs(ch) {
    return ch === ' ' || ch === '\n' || ch === '\r' || ch === '\t';
  }

  while (i < len && isWs(text[i])) i++;
  if (text[i] !== '[') {
    const err = new Error('iterateJsonArrayObjectStrings: expected top-level array "["');
    err.code = 'JSON_NOT_ARRAY';
    throw err;
  }
  i++; // skip '['

  while (i < len) {
    while (i < len && isWs(text[i])) i++;
    if (text[i] === ']') return; // empty or end
    if (text[i] === ',') {
      i++;
      continue;
    }
    if (text[i] !== '{') {
      // Skip unexpected tokens (defensive)
      i++;
      continue;
    }

    const start = i;
    let depth = 0;
    let inStr = false;
    let esc = false;

    while (i < len) {
      const ch = text[i];
      if (inStr) {
        if (esc) {
          esc = false;
        } else if (ch === '\\') {
          esc = true;
        } else if (ch === '"') {
          inStr = false;
        }
        i++;
        continue;
      }

      if (ch === '"') {
        inStr = true;
        i++;
        continue;
      }
      if (ch === '{') {
        depth++;
        i++;
        continue;
      }
      if (ch === '}') {
        depth--;
        i++;
        if (depth === 0) break;
        continue;
      }
      i++;
    }

    if (depth !== 0) {
      const err = new Error('iterateJsonArrayObjectStrings: unterminated object');
      err.code = 'JSON_OBJECT_UNTERMINATED';
      throw err;
    }

    const objStr = text.slice(start, i); // i is right after closing '}'
    onObjectString(objStr);
  }
}

if (typeof module !== 'undefined') {
  module.exports = { parseDriveJsonFile, readDriveTextFile, iterateJsonArrayObjectStrings };
}


