const test = require('node:test');
const assert = require('node:assert/strict');

const { createEmptyGpx, gpxHasDay, buildDayTrkseg, appendTrksegToGpxXml } = require('../../gas/src/gpx/append');

test('appendTrksegToGpxXml: 日付マーカー付きtrksegを追記できる', () => {
  const base = createEmptyGpx({ name: 'timeline-all' });
  const seg = buildDayTrkseg({
    date: '2010-12-20',
    points: [
      { lat: 35.0, lng: 139.0, time: '2010-12-20T00:00:00.000Z' },
      { lat: 35.1, lng: 139.1 }
    ]
  });
  const out = appendTrksegToGpxXml(base, seg);
  assert.ok(out.includes('<!-- day:2010-12-20 -->'));
  assert.ok(out.includes('<trkseg>'));
  assert.ok(out.includes('<trkpt lat="35" lon="139"><time>2010-12-20T00:00:00.000Z</time></trkpt>'));
  assert.ok(out.includes('<trkpt lat="35.1" lon="139.1"></trkpt>'));
});

test('gpxHasDay: 既に追記済みの日付を検出できる', () => {
  const base = createEmptyGpx({ name: 'timeline-all' });
  const seg = buildDayTrkseg({ date: '2010-12-20', points: [{ lat: 1, lng: 2 }] });
  const out = appendTrksegToGpxXml(base, seg);
  assert.equal(gpxHasDay(out, '2010-12-20'), true);
  assert.equal(gpxHasDay(out, '2010-12-21'), false);
});


