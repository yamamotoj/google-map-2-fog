function escapeXml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function buildTrkpts(points) {
  return (points || [])
    .map((p) => {
      const lat = Number(p.lat);
      const lon = Number(p.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return '';
      const time = p.time ? `<time>${escapeXml(p.time)}</time>` : '';
      return `<trkpt lat="${lat}" lon="${lon}">${time}</trkpt>`;
    })
    .filter(Boolean)
    .join('');
}

function createEmptyGpx({ name } = {}) {
  const safeName = name ? escapeXml(name) : null;
  const nameNode = safeName ? `<name>${safeName}</name>` : '';
  return (
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<gpx version="1.1" creator="google-map-2-fog" xmlns="http://www.topografix.com/GPX/1/1">` +
    `<trk>${nameNode}</trk>` +
    `</gpx>`
  );
}

function dayMarker(date) {
  return `<!-- day:${String(date)} -->`;
}

function gpxHasDay(xml, date) {
  return String(xml || '').includes(dayMarker(date));
}

function buildDayTrkseg({ date, points }) {
  const trkpts = buildTrkpts(points);
  return `${dayMarker(date)}<trkseg>${trkpts}</trkseg>`;
}

function appendTrksegToGpxXml(existingXml, trksegXml) {
  const xml = String(existingXml || '');
  const idx = xml.lastIndexOf('</trk>');
  if (idx < 0) {
    const err = new Error('appendTrksegToGpxXml: missing </trk>');
    err.code = 'GPX_INVALID';
    throw err;
  }
  return xml.slice(0, idx) + trksegXml + xml.slice(idx);
}

if (typeof module !== 'undefined') {
  module.exports = {
    createEmptyGpx,
    gpxHasDay,
    buildDayTrkseg,
    appendTrksegToGpxXml
  };
}


