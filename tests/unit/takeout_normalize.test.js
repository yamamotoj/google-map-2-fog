const test = require('node:test');
const assert = require('node:assert/strict');

const { normalizeFromTakeoutJson } = require('../../gas/src/takeout/normalize');

test('normalizeFromTakeoutJson: locations[] を TimelinePoint[] に正規化できる', () => {
  const input = {
    locations: [
      { latitudeE7: 356000000, longitudeE7: 1397000000, timestampMs: '1700000000000', accuracy: 20 },
      { latitudeE7: 356000000, longitudeE7: 1397000000, timestampMs: '1700000000000', accuracy: 20 }, // dup
      { latitudeE7: 0, longitudeE7: 0, timestampMs: '1700000001000' }
    ]
  };

  const points = normalizeFromTakeoutJson(input);
  assert.equal(points.length, 2, '重複が除去されること');
  assert.equal(points[0].lat, 35.6);
  assert.equal(points[0].lng, 139.7);
  assert.ok(points[0].time.endsWith('Z'));
});


