function escapeXml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function haversineMeters(a, b) {
  const toRad = (d) => (d * Math.PI) / 180;
  const R = 6371000;
  const lat1 = toRad(Number(a.lat));
  const lat2 = toRad(Number(b.lat));
  const dLat = lat2 - lat1;
  const dLng = toRad(Number(b.lng) - Number(a.lng));
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

function splitPointsByDistance(points, breakDistanceMeters) {
  const pts = Array.isArray(points) ? points : [];
  const threshold = Number(breakDistanceMeters) || 0;
  if (!(threshold > 0) || pts.length <= 1) return [pts];
  const segs = [];
  let cur = [];
  for (const p of pts) {
    if (cur.length === 0) {
      cur.push(p);
      continue;
    }
    const prev = cur[cur.length - 1];
    const dist = haversineMeters(prev, p);
    if (Number.isFinite(dist) && dist >= threshold) {
      segs.push(cur);
      cur = [p];
    } else {
      cur.push(p);
    }
  }
  if (cur.length) segs.push(cur);
  return segs;
}

/**
 * Build a GPX track (trk/trkseg/trkpt).
 * @param {{name?: string, points: Array<{lat:number,lng:number,time?:string}>, breakDistanceMeters?:number}} input
 */
function buildGpxTrack({ name, points, breakDistanceMeters } = {}) {
  const safeName = name ? escapeXml(name) : null;
  const segs = splitPointsByDistance(points || [], breakDistanceMeters);
  const trksegs = segs
    .map((seg) => {
      const trkpts = (seg || [])
        .map((p) => {
          const lat = Number(p.lat);
          const lon = Number(p.lng);
          if (!Number.isFinite(lat) || !Number.isFinite(lon)) return '';
          const time = p.time ? `<time>${escapeXml(p.time)}</time>` : '';
          return `<trkpt lat="${lat}" lon="${lon}">${time}</trkpt>`;
        })
        .filter(Boolean)
        .join('');
      return `<trkseg>${trkpts}</trkseg>`;
    })
    .join('');

  const nameNode = safeName ? `<name>${safeName}</name>` : '';

  // Minimal GPX 1.1 structure; Fog of World import compatibility is validated manually.
  return (
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<gpx version="1.1" creator="google-map-2-fog" xmlns="http://www.topografix.com/GPX/1/1">` +
    `<trk>${nameNode}${trksegs}</trk>` +
    `</gpx>`
  );
}

if (typeof module !== 'undefined') {
  module.exports = { buildGpxTrack, splitPointsByDistance, haversineMeters };
}


