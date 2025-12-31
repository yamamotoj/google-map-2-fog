function _splitExt(name) {
  const base = (name || '').trim();
  const m = base.match(/^(.*?)(\.gpx)?$/i);
  const head = m ? m[1] : base;
  const ext = m && m[2] ? m[2] : '.gpx';
  return { head, ext };
}

function ensureStartDateInFileName(fileName, startDate) {
  const base = (fileName || '').trim();
  const sd = (startDate || '').trim();
  if (!sd) return base;
  if (base.includes(sd)) return base;
  const { head, ext } = _splitExt(base);
  return `${head}-${sd}${ext}`;
}

function buildYearlyOutputFileName(fileNameOrNull, year) {
  const y = String(year || '').trim();
  const base = (fileNameOrNull || '').trim() || 'timeline.gpx';
  if (!y) return base;

  const { head, ext } = _splitExt(base);
  const yyyy0101 = `${y}-01-01`;

  // If base is already the correct yearly file, keep as-is.
  if (head.endsWith(`-${yyyy0101}`)) return `${head}${ext}`;

  // If the user provided a concrete date (e.g. timeline-2010-01-01.gpx),
  // treat it as a template and strip the trailing date for the prefix.
  const prefix = head.replace(/-\d{4}-\d{2}-\d{2}$/u, '');
  return `${prefix}-${yyyy0101}${ext}`;
}

if (typeof module !== 'undefined') {
  module.exports = { ensureStartDateInFileName, buildYearlyOutputFileName };
}


