const test = require('node:test');
const assert = require('node:assert/strict');

const { iterateJsonArrayObjectStrings } = require('../../gas/src/takeout/parser');
const { normalizeIphoneDayPointsFromJsonText } = require('../../gas/src/takeout/normalize');

test('iterateJsonArrayObjectStrings: top-level arrayからobject文字列を順に取り出せる', () => {
  const text = `[
    {"a":1,"b":{"c":"x"},"d":[1,2,3]},
    {"a":2,"b":{"c":"y"},"msg":"brace in string } and \\"quote\\""}
  ]`;

  const objs = [];
  iterateJsonArrayObjectStrings(text, (s) => objs.push(JSON.parse(s)));

  assert.equal(objs.length, 2);
  assert.equal(objs[0].a, 1);
  assert.equal(objs[1].b.c, 'y');
});

test('normalizeIphoneDayPointsFromJsonText: 対象日のポイントだけ抽出できる', () => {
  const text = `[
    {
      "startTime":"2010-12-19T23:00:00.000+09:00",
      "endTime":"2010-12-20T01:00:00.000+09:00",
      "activity":{"start":"geo:35.0,139.0","end":"geo:35.1,139.1"}
    },
    {
      "startTime":"2010-12-20T10:00:00.000+09:00",
      "endTime":"2010-12-20T11:00:00.000+09:00",
      "visit":{"topCandidate":{"placeLocation":"geo:36.0,140.0"}}
    }
  ]`;

  const pts = normalizeIphoneDayPointsFromJsonText(text, '2010-12-20');
  // activity end (2010-12-20) + visit start (2010-12-20)
  assert.equal(pts.length, 2);
  assert.equal(pts[0].lat.toFixed(1), '35.1');
  assert.equal(pts[1].lat.toFixed(1), '36.0');
});


