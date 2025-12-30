const test = require('node:test');
const assert = require('node:assert/strict');

const { decodePolyline } = require('../../gas/src/routes/polyline');
const { buildRouteCacheKey } = require('../../gas/src/routes/cache');
const { enrichPointsWithRoutes } = require('../../gas/src/routes/enrich');

test('decodePolyline: 既知のpolylineをデコードできる', () => {
  // Example from Google polyline algorithm docs
  const encoded = '_p~iF~ps|U_ulLnnqC_mqNvxq`@';
  const pts = decodePolyline(encoded);
  assert.equal(pts.length, 3);
  assert.equal(pts[0].lat.toFixed(5), '38.50000');
  assert.equal(pts[0].lng.toFixed(5), '-120.20000');
  assert.equal(pts[2].lat.toFixed(5), '43.25200');
  assert.equal(pts[2].lng.toFixed(5), '-126.45300');
});

test('buildRouteCacheKey: 同一入力で安定したキーを生成する', () => {
  const key1 = buildRouteCacheKey({
    mode: 'driving',
    origin: { lat: 35.1, lng: 139.1 },
    destination: { lat: 35.2, lng: 139.2 }
  });
  const key2 = buildRouteCacheKey({
    mode: 'driving',
    origin: { lat: 35.1, lng: 139.1 },
    destination: { lat: 35.2, lng: 139.2 }
  });
  assert.equal(key1, key2);
  assert.ok(key1.startsWith('route:v1:driving:'));
});

test('enrichPointsWithRoutes: 無効時は入力をそのまま返す', () => {
  const pts = [
    { lat: 35.0, lng: 139.0, time: '2010-12-20T00:00:00.000Z' },
    { lat: 35.1, lng: 139.1, time: '2010-12-20T01:00:00.000Z' }
  ];
  const out = enrichPointsWithRoutes({ points: pts, config: { enableRouteEnrichment: false }, jobState: {}, logger: console });
  assert.equal(out.points.length, 2);
});

test('enrichPointsWithRoutes: 予算があれば中間点を挿入できる（HTTPはスタブ）', () => {
  // stub fetchDirectionsRoute globally (used by enrich.js resolver)
  global.fetchDirectionsRoute = () => ({
    polyline: '_p~iF~ps|U_ulLnnqC_mqNvxq`@'
  });

  const jobState = {
    budget: {
      maxRouteRequestsPerDay: 10,
      routeRequestsUsedToday: 0,
      lastBudgetResetDate: '2010-12-20'
    }
  };

  const pts = [
    { lat: 38.5, lng: -120.2, time: '2010-12-20T00:00:00.000Z' },
    { lat: 43.252, lng: -126.453, time: '2010-12-20T01:00:00.000Z' }
  ];

  const res = enrichPointsWithRoutes({
    points: pts,
    config: { enableRouteEnrichment: true, mapsApiKey: 'dummy', routeTravelMode: 'driving', routeMinDistanceMeters: 0 },
    jobState,
    logger: { warn: () => {}, info: () => {} }
  });

  // original 2 points + 1 middle point (from decoded polyline)
  assert.equal(res.points.length, 3);
  assert.equal(jobState.budget.routeRequestsUsedToday, 1);
});


