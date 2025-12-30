const test = require('node:test');
const assert = require('node:assert/strict');

const { decodePolyline } = require('../../gas/src/routes/polyline');
const { buildRouteCacheKey } = require('../../gas/src/routes/cache');
const { enrichPointsWithRoutes, inferTravelMode } = require('../../gas/src/routes/enrich');

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

test('inferTravelMode: 速度に応じてwalking/bicycling/drivingを推定できる', () => {
  // ~111m in 60s => 1.85m/s => walking
  const walking = inferTravelMode({
    origin: { lat: 0, lng: 0, time: '2010-01-01T00:00:00.000Z' },
    destination: { lat: 0.001, lng: 0, time: '2010-01-01T00:01:00.000Z' },
    fallbackMode: 'driving'
  });
  assert.equal(walking, 'walking');

  // ~1110m in 300s => 3.7m/s => bicycling
  const biking = inferTravelMode({
    origin: { lat: 0, lng: 0, time: '2010-01-01T00:00:00.000Z' },
    destination: { lat: 0.01, lng: 0, time: '2010-01-01T00:05:00.000Z' },
    fallbackMode: 'driving'
  });
  assert.equal(biking, 'bicycling');

  // ~11.1km in 600s => 18.5m/s => driving
  const driving = inferTravelMode({
    origin: { lat: 0, lng: 0, time: '2010-01-01T00:00:00.000Z' },
    destination: { lat: 0.1, lng: 0, time: '2010-01-01T00:10:00.000Z' },
    fallbackMode: 'walking'
  });
  assert.equal(driving, 'driving');
});

test('inferTravelMode: 条件を満たすとtransitを推定できる（オプション有効時）', () => {
  // ~11.1km in 20min => ~9.25 m/s => transit候補帯
  const transit = inferTravelMode({
    origin: { lat: 0, lng: 0, time: '2010-01-01T00:00:00.000Z' },
    destination: { lat: 0.1, lng: 0, time: '2010-01-01T00:20:00.000Z' },
    fallbackMode: 'driving',
    allowTransit: true
  });
  assert.equal(transit, 'transit');
});

test('enrichPointsWithRoutes: 予算切れなら停止フラグを返す（点のみ継続しない）', () => {
  global.fetchDirectionsRoute = () => ({
    polyline: '_p~iF~ps|U_ulLnnqC_mqNvxq`@'
  });

  const jobState = {
    budget: {
      maxRouteRequestsPerDay: 0,
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
    config: { enableRouteEnrichment: true, mapsApiKey: 'dummy', routeTravelMode: 'driving', routeMinDistanceMeters: 0, enableRouteModeAuto: false },
    jobState,
    logger: { warn: () => {}, info: () => {} }
  });

  assert.equal(res.stoppedDueToBudget, true);
  assert.equal(res.points.length, 0);
});


