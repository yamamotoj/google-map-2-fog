const test = require('node:test');
const assert = require('node:assert/strict');

const { normalizeFromTakeoutJson } = require('../../gas/src/takeout/normalize');

test('normalizeFromTakeoutJson: iPhoneエクスポート形式（配列）を正規化できる', () => {
  const input = [
    {
      startTime: '2010-12-19T17:18:31.245+09:00',
      endTime: '2010-12-20T09:14:23.200+09:00',
      activity: {
        start: 'geo:35.701550,139.797656',
        end: 'geo:35.692916,139.699184'
      }
    },
    {
      startTime: '2010-12-21T09:22:05.846+09:00',
      endTime: '2010-12-21T09:34:57.276+09:00',
      visit: {
        topCandidate: {
          placeLocation: 'geo:35.670399,139.702715'
        }
      }
    }
  ];

  const points = normalizeFromTakeoutJson(input);
  assert.ok(points.length >= 3);
  assert.equal(points[0].lat.toFixed(6), '35.701550');
  assert.equal(points[0].lng.toFixed(6), '139.797656');
});


