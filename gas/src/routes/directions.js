function _assertUrlFetch() {
  if (typeof UrlFetchApp === 'undefined') {
    const err = new Error('UrlFetchApp is not available (must run in Apps Script)');
    err.code = 'URLFETCH_NOT_AVAILABLE';
    throw err;
  }
}

function fetchDirectionsRoute({
  apiKey,
  origin,
  destination,
  mode = 'driving'
}) {
  _assertUrlFetch();

  const key = String(apiKey || '').trim();
  if (!key) {
    const err = new Error('Missing MAPS_API_KEY');
    err.code = 'MAPS_API_KEY_MISSING';
    throw err;
  }

  const o = `${origin.lat},${origin.lng}`;
  const d = `${destination.lat},${destination.lng}`;
  const m = String(mode || 'driving').toLowerCase();

  const url =
    'https://maps.googleapis.com/maps/api/directions/json' +
    `?origin=${encodeURIComponent(o)}` +
    `&destination=${encodeURIComponent(d)}` +
    `&mode=${encodeURIComponent(m)}` +
    `&key=${encodeURIComponent(key)}`;

  const res = UrlFetchApp.fetch(url, {
    method: 'get',
    muteHttpExceptions: true
  });

  const code = res.getResponseCode();
  const body = res.getContentText('UTF-8');

  if (code < 200 || code >= 300) {
    const err = new Error(`Directions API HTTP ${code}`);
    err.code = 'DIRECTIONS_HTTP_ERROR';
    err.details = body?.slice?.(0, 500) || String(body);
    throw err;
  }

  let json;
  try {
    json = JSON.parse(body);
  } catch (e) {
    const err = new Error('Directions API returned invalid JSON');
    err.code = 'DIRECTIONS_BAD_JSON';
    err.cause = e;
    throw err;
  }

  if (json.status !== 'OK') {
    const err = new Error(`Directions API status: ${json.status}`);
    err.code = 'DIRECTIONS_STATUS_NOT_OK';
    err.status = json.status;
    err.errorMessage = json.error_message || null;
    throw err;
  }

  const route = json.routes?.[0];
  const polyline = route?.overview_polyline?.points || null;
  const leg = route?.legs?.[0] || null;

  return {
    polyline,
    distanceMeters: leg?.distance?.value ?? null,
    durationSeconds: leg?.duration?.value ?? null
  };
}

if (typeof module !== 'undefined') {
  module.exports = { fetchDirectionsRoute };
}


