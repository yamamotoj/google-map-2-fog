function escapeXml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Build a GPX track (trk/trkseg/trkpt).
 * @param {{name?: string, points: Array<{lat:number,lng:number,time?:string}>}} input
 */
function buildGpxTrack({ name, points }) {
  const safeName = name ? escapeXml(name) : null;
  const trkpts = (points || [])
    .map((p) => {
      const lat = Number(p.lat);
      const lon = Number(p.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return '';
      const time = p.time ? `<time>${escapeXml(p.time)}</time>` : '';
      return `<trkpt lat="${lat}" lon="${lon}">${time}</trkpt>`;
    })
    .filter(Boolean)
    .join('');

  const nameNode = safeName ? `<name>${safeName}</name>` : '';

  // Minimal GPX 1.1 structure; Fog of World import compatibility is validated manually.
  return (
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<gpx version="1.1" creator="google-map-2-fog" xmlns="http://www.topografix.com/GPX/1/1">` +
    `<trk>${nameNode}<trkseg>${trkpts}</trkseg></trk>` +
    `</gpx>`
  );
}

if (typeof module !== 'undefined') {
  module.exports = { buildGpxTrack };
}


