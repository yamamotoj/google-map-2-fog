const test = require('node:test');
const assert = require('node:assert/strict');

const { ensureStartDateInFileName, buildYearlyOutputFileName } = require('../../gas/src/gpx/fileName');

test('buildYearlyOutputFileName: timeline-YYYY-01-01.gpx 形式になる', () => {
  assert.equal(buildYearlyOutputFileName('timeline.gpx', '2011'), 'timeline-2011-01-01.gpx');
});

test('ensureStartDateInFileName: 開始日を含まない場合は付与する', () => {
  assert.equal(ensureStartDateInFileName('timeline-2011.gpx', '2010-01-01'), 'timeline-2011-2010-01-01.gpx');
});

test('buildYearlyOutputFileName: 日付入りのOUTPUT_FILE_NAMEはテンプレとして扱う', () => {
  assert.equal(buildYearlyOutputFileName('timeline-2010-01-01.gpx', '2011'), 'timeline-2011-01-01.gpx');
});


