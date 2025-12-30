function toNumberE7(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function e7ToDegrees(e7) {
  return e7 / 1e7;
}

function toIsoFromTimestampMs(ts) {
  if (ts == null) return null;
  const n = Number(ts);
  if (!Number.isFinite(n)) return null;
  return new Date(n).toISOString();
}

function normalizePoint({ lat, lng, time, accuracyMeters }) {
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) return null;
  if (!Number.isFinite(lng) || lng < -180 || lng > 180) return null;
  if (!time) return null;
  return {
    lat,
    lng,
    time,
    accuracyMeters: Number.isFinite(accuracyMeters) ? accuracyMeters : undefined
  };
}

function normalizeFromLocationsArray(locations) {
  const points = [];
  for (const rec of locations || []) {
    const latE7 = toNumberE7(rec.latitudeE7);
    const lngE7 = toNumberE7(rec.longitudeE7);
    const time = toIsoFromTimestampMs(rec.timestampMs) || (rec.timestamp ? new Date(rec.timestamp).toISOString() : null);
    const accuracy = rec.accuracy != null ? Number(rec.accuracy) : undefined;
    if (latE7 == null || lngE7 == null) continue;
    const p = normalizePoint({
      lat: e7ToDegrees(latE7),
      lng: e7ToDegrees(lngE7),
      time,
      accuracyMeters: accuracy
    });
    if (p) points.push(p);
  }
  return points;
}

function normalizeFromSemanticTimelineObjects(timelineObjects) {
  const points = [];
  for (const obj of timelineObjects || []) {
    if (obj.placeVisit?.location) {
      const loc = obj.placeVisit.location;
      const latE7 = toNumberE7(loc.latitudeE7);
      const lngE7 = toNumberE7(loc.longitudeE7);
      const time = obj.placeVisit.duration?.startTimestamp
        ? new Date(obj.placeVisit.duration.startTimestamp).toISOString()
        : null;
      if (latE7 == null || lngE7 == null) continue;
      const p = normalizePoint({ lat: e7ToDegrees(latE7), lng: e7ToDegrees(lngE7), time });
      if (p) points.push(p);
      continue;
    }

    if (obj.activitySegment?.startLocation && obj.activitySegment?.endLocation) {
      const start = obj.activitySegment.startLocation;
      const end = obj.activitySegment.endLocation;
      const startTime = obj.activitySegment.duration?.startTimestamp
        ? new Date(obj.activitySegment.duration.startTimestamp).toISOString()
        : null;
      const endTime = obj.activitySegment.duration?.endTimestamp
        ? new Date(obj.activitySegment.duration.endTimestamp).toISOString()
        : null;

      const sLatE7 = toNumberE7(start.latitudeE7);
      const sLngE7 = toNumberE7(start.longitudeE7);
      const eLatE7 = toNumberE7(end.latitudeE7);
      const eLngE7 = toNumberE7(end.longitudeE7);
      if (sLatE7 != null && sLngE7 != null) {
        const p = normalizePoint({ lat: e7ToDegrees(sLatE7), lng: e7ToDegrees(sLngE7), time: startTime });
        if (p) points.push(p);
      }
      if (eLatE7 != null && eLngE7 != null) {
        const p = normalizePoint({ lat: e7ToDegrees(eLatE7), lng: e7ToDegrees(eLngE7), time: endTime || startTime });
        if (p) points.push(p);
      }
    }
  }
  return points;
}

function dedupeByLatLngTime(points) {
  const seen = new Set();
  const out = [];
  for (const p of points) {
    const key = `${p.lat.toFixed(6)},${p.lng.toFixed(6)},${p.time}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(p);
  }
  return out;
}

function parseGeo(s) {
  if (!s || typeof s !== 'string') return null;
  const m = s.match(/^geo:([\-0-9.]+),([\-0-9.]+)$/);
  if (!m) return null;
  const lat = Number(m[1]);
  const lng = Number(m[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

function normalizeFromIphoneTimelineExport(records) {
  // Top-level array of objects with {startTime,endTime,activity?,visit?}
  const points = [];
  for (const r of records || []) {
    const startTime = r?.startTime ? new Date(r.startTime).toISOString() : null;
    const endTime = r?.endTime ? new Date(r.endTime).toISOString() : null;

    if (r?.visit?.topCandidate?.placeLocation) {
      const g = parseGeo(r.visit.topCandidate.placeLocation);
      if (g && startTime) {
        const p = normalizePoint({ lat: g.lat, lng: g.lng, time: startTime });
        if (p) points.push(p);
      }
      continue;
    }

    if (r?.activity?.start || r?.activity?.end) {
      const s = parseGeo(r.activity.start);
      const e = parseGeo(r.activity.end);
      if (s && startTime) {
        const p = normalizePoint({ lat: s.lat, lng: s.lng, time: startTime });
        if (p) points.push(p);
      }
      if (e && endTime) {
        const p = normalizePoint({ lat: e.lat, lng: e.lng, time: endTime });
        if (p) points.push(p);
      }
    }
  }
  return points;
}

/**
 * Normalize an export JSON into TimelinePoint[].
 * Supported formats:
 * - Takeout-style objects with "locations" or "timelineObjects"
 * - iPhone timeline export (top-level array with {startTime,endTime,activity?,visit?})
 * Returns TimelinePoint[] sorted by time ascending.
 */
function normalizeFromTakeoutJson(json) {
  const rawPoints = Array.isArray(json)
    ? normalizeFromIphoneTimelineExport(json)
    : Array.isArray(json?.locations)
      ? normalizeFromLocationsArray(json.locations)
      : Array.isArray(json?.timelineObjects)
        ? normalizeFromSemanticTimelineObjects(json.timelineObjects)
        : [];

  const deduped = dedupeByLatLngTime(rawPoints);
  deduped.sort((a, b) => (a.time < b.time ? -1 : a.time > b.time ? 1 : 0));
  return deduped;
}

if (typeof module !== 'undefined') {
  module.exports = { normalizeFromTakeoutJson };
}


