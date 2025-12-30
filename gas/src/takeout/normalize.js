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

/**
 * Normalize a Takeout JSON (either "locations" or "timelineObjects").
 * Returns TimelinePoint[] sorted by time ascending.
 */
function normalizeFromTakeoutJson(json) {
  const rawPoints = Array.isArray(json?.locations)
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


