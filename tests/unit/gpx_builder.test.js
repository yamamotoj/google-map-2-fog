const test = require('node:test');
const assert = require('node:assert/strict');

const { buildGpxTrack } = require('../../gas/src/gpx/builder');

test('buildGpxTrack: trkpt(lat/lon) と time を含む', () => {
  const xml = buildGpxTrack({
    name: 'timeline-2025-01-01',
    points: [
      { lat: 35.6, lng: 139.7, time: '2025-01-01T00:00:00Z' },
      { lat: 35.61, lng: 139.71, time: '2025-01-01T00:10:00Z' }
    ]
  });

  assert.match(xml, /<gpx[^>]*>/);
  assert.match(xml, /<trk>/);
  assert.match(xml, /<trkpt lat="35\.6" lon="139\.7">/);
  assert.match(xml, /<time>2025-01-01T00:00:00Z<\/time>/);
  assert.match(xml, /<\/gpx>/);
});


