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

function inferTravelMode({ origin, destination, fallbackMode = 'driving', allowTransit = false }) {
  const fallback = String(fallbackMode || 'driving').toLowerCase();
  const t1 = origin?.time ? Date.parse(origin.time) : NaN;
  const t2 = destination?.time ? Date.parse(destination.time) : NaN;
  const dist = haversineMeters(origin, destination);
  const dtSec = Number.isFinite(t1) && Number.isFinite(t2) ? Math.max(0, (t2 - t1) / 1000) : NaN;

  // If we can't compute speed, fall back.
  if (!Number.isFinite(dist) || dist <= 0) return fallback;
  if (!Number.isFinite(dtSec) || dtSec <= 0) return fallback;

  const speed = dist / dtSec; // m/s

  // Heuristic thresholds:
  // - walking: < ~2.2 m/s (8 km/h)
  // - bicycling: < ~7.0 m/s (25 km/h)
  // - transit: ~8.3..25 m/s (30..90 km/h) AND distance >= 5km AND duration >= 10min
  // - driving: otherwise
  // NOTE: transit is optional because it can be inaccurate without additional constraints.
  if (speed < 2.2) return 'walking';
  if (speed < 7.0) return 'bicycling';
  if (allowTransit) {
    if (dist >= 5000 && dtSec >= 600 && speed >= 8.3 && speed <= 25.0) return 'transit';
  }
  return 'driving';
}

function _resolveDecodePolyline() {
  if (typeof decodePolyline !== 'undefined') return decodePolyline;
  if (typeof require !== 'undefined') return require('./polyline').decodePolyline;
  throw new Error('decodePolyline is not available');
}

function _resolveCanConsumeRouteRequest() {
  if (typeof canConsumeRouteRequest !== 'undefined') return canConsumeRouteRequest;
  if (typeof require !== 'undefined') return require('../state/budget').canConsumeRouteRequest;
  throw new Error('canConsumeRouteRequest is not available');
}

function _resolveConsumeRouteRequest() {
  if (typeof consumeRouteRequest !== 'undefined') return consumeRouteRequest;
  if (typeof require !== 'undefined') return require('../state/budget').consumeRouteRequest;
  throw new Error('consumeRouteRequest is not available');
}

function _resolveFetchDirectionsRoute() {
  if (typeof fetchDirectionsRoute !== 'undefined') return fetchDirectionsRoute;
  if (typeof require !== 'undefined') return require('./directions').fetchDirectionsRoute;
  throw new Error('fetchDirectionsRoute is not available');
}

function _resolveRouteCache() {
  const build = typeof buildRouteCacheKey !== 'undefined' ? buildRouteCacheKey : (typeof require !== 'undefined' ? require('./cache').buildRouteCacheKey : null);
  const get = typeof getRouteFromCache !== 'undefined' ? getRouteFromCache : (typeof require !== 'undefined' ? require('./cache').getRouteFromCache : null);
  const put = typeof putRouteToCache !== 'undefined' ? putRouteToCache : (typeof require !== 'undefined' ? require('./cache').putRouteToCache : null);
  if (!build || !get || !put) throw new Error('route cache functions are not available');
  return { build, get, put };
}

function _resolveOpenDayRouteCache() {
  if (typeof openDayRouteCache !== 'undefined') return openDayRouteCache;
  if (typeof require !== 'undefined') return require('./dayCache').openDayRouteCache;
  return null;
}

/**
 * Enrich consecutive points with route polyline points between them.
 * - Respects daily budget (jobState.budget.*)
 * - Uses CacheService (best-effort) to avoid repeat API calls
  * - Fails safe: if route fails, falls back to original points
  * - If budget is exhausted, STOP and signal caller to halt the run (no partial export)
 *
 * @returns {{points:Array, stoppedDueToBudget?:boolean, stats:{pairs:number,requested:number,cacheHit:number,addedPoints:number,skippedBudget:number,failed:number}}}
 */
function enrichPointsWithRoutes({ points, config, jobState, logger }) {
  const pts = Array.isArray(points) ? points : [];
  const out = [];
  const stats = { pairs: 0, requested: 0, cacheHit: 0, addedPoints: 0, skippedBudget: 0, failed: 0 };
  let stoppedDueToBudget = false;

  if (!config?.enableRouteEnrichment) {
    return { points: pts, stats };
  }
  if (!config?.mapsApiKey) {
    logger?.warn?.('route enrichment enabled but MAPS_API_KEY is missing; fallback to points only');
    return { points: pts, stats };
  }
  if (pts.length <= 1) return { points: pts, stats };

  const minDist = Math.max(0, Number(config.routeMinDistanceMeters) || 0);
  const configuredMode = String(config.routeTravelMode || 'driving').toLowerCase();
  const autoMode = Boolean(config.enableRouteModeAuto);
  const autoFallback = String(config.routeModeAutoFallback || configuredMode || 'driving').toLowerCase();
  const autoTransit = autoMode; // auto有効ならtransitも候補に含める（ヒューリスティックで過剰選択は抑える）
  const decode = _resolveDecodePolyline();
  const fetchRoute = _resolveFetchDirectionsRoute();
  const cache = _resolveRouteCache();
  const canConsume = _resolveCanConsumeRouteRequest();
  const consume = _resolveConsumeRouteRequest();

  out.push(pts[0]);
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    stats.pairs++;

    const dist = haversineMeters(a, b);
    if (minDist > 0 && dist < minDist) {
      out.push(b);
      continue;
    }

    if (!canConsume(jobState)) {
      stats.skippedBudget++;
      stoppedDueToBudget = true;
      break;
    }

    const modeForPair = autoMode
      ? inferTravelMode({ origin: a, destination: b, fallbackMode: autoFallback, allowTransit: autoTransit })
      : configuredMode;

    const key = cache.build({ mode: modeForPair, origin: a, destination: b });
    const cached = cache.get(key);
    let route;
    if (cached) {
      stats.cacheHit++;
      route = cached;
    } else {
      try {
        stats.requested++;
        consume(jobState, 1);
        const departureTimeEpochSeconds =
          modeForPair === 'transit' && a?.time ? Math.floor(Date.parse(a.time) / 1000) : null;
        route = fetchRoute({
          apiKey: config.mapsApiKey,
          origin: a,
          destination: b,
          mode: modeForPair,
          departureTimeEpochSeconds
        });
        // cache only successful responses
        cache.put(key, route);
      } catch (e) {
        stats.failed++;
        logger?.warn?.('route request failed; fallback to points only', {
          origin: { lat: a.lat, lng: a.lng },
          destination: { lat: b.lat, lng: b.lng },
          mode: modeForPair,
          error: String(e?.message || e),
          code: e?.code || null
        });
        out.push(b);
        continue;
      }
    }

    const poly = route?.polyline;
    if (!poly) {
      out.push(b);
      continue;
    }
    const decoded = decode(poly);
    // decoded includes endpoints; we keep original a/b to preserve time fields
    // so we only insert middle points
    const middle = decoded.slice(1, Math.max(1, decoded.length - 1));
    for (const p of middle) {
      out.push({ lat: p.lat, lng: p.lng });
    }
    stats.addedPoints += middle.length;
    out.push(b);
  }

  return { points: stoppedDueToBudget ? [] : out, stoppedDueToBudget, stats };
}

// Expose for Apps Script runtime
globalThis.enrichPointsWithRoutes = enrichPointsWithRoutes;

if (typeof module !== 'undefined') {
  module.exports = { enrichPointsWithRoutes, haversineMeters, inferTravelMode };
}


