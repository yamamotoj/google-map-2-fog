const test = require('node:test');
const assert = require('node:assert/strict');

const { createEmptyGpx, gpxHasDay, buildDayTrkseg, appendTrksegToGpxXml } = require('../../gas/src/gpx/append');

test('appendTrksegToGpxXml: 日付マーカー付きtrksegを追記できる', () => {
  const base = createEmptyGpx({ name: 'timeline-all' });
  const seg = buildDayTrkseg({
    date: '2010-12-20',
    breakDistanceMeters: 2000,
    points: [
      { lat: 35.0, lng: 139.0, time: '2010-12-20T00:00:00.000Z' },
      { lat: 35.03, lng: 139.0 } // ~3.3km -> new trkseg
    ]
  });
  const out = appendTrksegToGpxXml(base, seg);
  assert.ok(out.includes('<!-- day:2010-12-20 -->'));
  // segmented
  assert.equal((out.match(/<trkseg>/g) || []).length, 2);
  assert.ok(out.includes('<trkpt lat="35" lon="139"><time>2010-12-20T00:00:00.000Z</time></trkpt>'));
  assert.ok(out.includes('<trkpt lat="35.03" lon="139"></trkpt>'));
});

test('gpxHasDay: 既に追記済みの日付を検出できる', () => {
  const base = createEmptyGpx({ name: 'timeline-all' });
  const seg = buildDayTrkseg({ date: '2010-12-20', points: [{ lat: 1, lng: 2 }] });
  const out = appendTrksegToGpxXml(base, seg);
  assert.equal(gpxHasDay(out, '2010-12-20'), true);
  assert.equal(gpxHasDay(out, '2010-12-21'), false);
});


