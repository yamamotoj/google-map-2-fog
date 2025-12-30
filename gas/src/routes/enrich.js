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

/**
 * Enrich consecutive points with route polyline points between them.
 * - Respects daily budget (jobState.budget.*)
 * - Uses CacheService (best-effort) to avoid repeat API calls
 * - Fails safe: if route fails, falls back to original points
 *
 * @returns {{points:Array, stats:{pairs:number,requested:number,cacheHit:number,addedPoints:number,skippedBudget:number,failed:number}}}
 */
function enrichPointsWithRoutes({ points, config, jobState, logger }) {
  const pts = Array.isArray(points) ? points : [];
  const out = [];
  const stats = { pairs: 0, requested: 0, cacheHit: 0, addedPoints: 0, skippedBudget: 0, failed: 0 };

  if (!config?.enableRouteEnrichment) {
    return { points: pts, stats };
  }
  if (!config?.mapsApiKey) {
    logger?.warn?.('route enrichment enabled but MAPS_API_KEY is missing; fallback to points only');
    return { points: pts, stats };
  }
  if (pts.length <= 1) return { points: pts, stats };

  const minDist = Math.max(0, Number(config.routeMinDistanceMeters) || 0);
  const mode = String(config.routeTravelMode || 'driving').toLowerCase();
  const decode = _resolveDecodePolyline();
  const fetchRoute = _resolveFetchDirectionsRoute();
  const cache = _resolveRouteCache();
  const canConsume = _resolveCanConsumeRouteRequest();
  const consume = _resolveConsumeRouteRequest();

  // In-run memory cache (avoid duplicate CacheService/HTTP for same key)
  const mem = {};

  function getCached(key) {
    if (mem[key]) return mem[key];
    const v = cache.get(key);
    if (v) mem[key] = v;
    return v || null;
  }
  function setCached(key, v) {
    mem[key] = v;
    cache.put(key, v);
  }

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
      out.push(b);
      continue;
    }

    const key = cache.build({ mode, origin: a, destination: b });
    const cached = getCached(key);
    let route;
    if (cached) {
      stats.cacheHit++;
      route = cached;
    } else {
      try {
        stats.requested++;
        consume(jobState, 1);
        route = fetchRoute({ apiKey: config.mapsApiKey, origin: a, destination: b, mode });
        // cache only successful responses
        setCached(key, route);
      } catch (e) {
        stats.failed++;
        logger?.warn?.('route request failed; fallback to points only', {
          origin: { lat: a.lat, lng: a.lng },
          destination: { lat: b.lat, lng: b.lng },
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

  return { points: out, stats };
}

// Expose for Apps Script runtime
globalThis.enrichPointsWithRoutes = enrichPointsWithRoutes;

if (typeof module !== 'undefined') {
  module.exports = { enrichPointsWithRoutes, haversineMeters };
}


