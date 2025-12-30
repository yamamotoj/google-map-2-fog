function _getScriptCache() {
  if (typeof CacheService === 'undefined') return null;
  try {
    return CacheService.getScriptCache();
  } catch (_) {
    return null;
  }
}

function buildRouteCacheKey({ mode, origin, destination }) {
  const oLat = Number(origin?.lat);
  const oLng = Number(origin?.lng);
  const dLat = Number(destination?.lat);
  const dLng = Number(destination?.lng);
  const m = String(mode || 'driving').toLowerCase();
  // keep key short (CacheService key length limit)
  const f = (n) => (Number.isFinite(n) ? n.toFixed(5) : 'nan');
  return `route:v1:${m}:${f(oLat)},${f(oLng)}:${f(dLat)},${f(dLng)}`;
}

function getRouteFromCache(key) {
  const cache = _getScriptCache();
  if (!cache) return null;
  const raw = cache.get(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (_) {
    return null;
  }
}

function putRouteToCache(key, value, { ttlSeconds = 60 * 60 * 24 } = {}) {
  const cache = _getScriptCache();
  if (!cache) return;
  try {
    cache.put(key, JSON.stringify(value), Math.max(1, ttlSeconds));
  } catch (_) {
    // ignore
  }
}

if (typeof module !== 'undefined') {
  module.exports = { buildRouteCacheKey, getRouteFromCache, putRouteToCache };
}


