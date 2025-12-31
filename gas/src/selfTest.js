/**
 * Apps Script上で「正規化→GPX生成→Drive出力→内容検証」まで通るかを確認するセルフテスト。
 *
 * - 実データや Script Properties に依存しない（安全に何度でも実行できる）
 * - Driveに一時フォルダ/ファイルを作って検証し、最後にゴミ箱へ移動する
 */

function _selfTestAssert(cond, message) {
  if (cond) return;
  const err = new Error(message || 'SelfTest assertion failed');
  err.code = 'SELFTEST_ASSERTION_FAILED';
  throw err;
}

function _selfTestNowIsoCompact() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return (
    d.getFullYear() +
    pad(d.getMonth() + 1) +
    pad(d.getDate()) +
    '-' +
    pad(d.getHours()) +
    pad(d.getMinutes()) +
    pad(d.getSeconds())
  );
}

function runSelfTest() {
  if (typeof DriveApp === 'undefined') {
    throw new Error('DriveApp is not available (must run in Apps Script)');
  }

  const date = '2010-12-20';
  const sampleJsonText = `[
    {
      "startTime" : "2010-12-19T17:18:31.245+09:00",
      "endTime" : "2010-12-20T09:14:23.200+09:00",
      "activity" : { "start" : "geo:35.701550,139.797656", "end" : "geo:35.692916,139.699184" }
    },
    {
      "startTime" : "2010-12-20T10:22:05.846+09:00",
      "endTime" : "2010-12-20T10:34:57.276+09:00",
      "visit" : { "topCandidate" : { "placeLocation" : "geo:35.670399,139.702715" } }
    }
  ]`;

  const folderName = `google-map-2-fog-selftest-${_selfTestNowIsoCompact()}`;
  const folder = DriveApp.createFolder(folderName);

  try {
    // 1) normalize (fast path)
    _selfTestAssert(typeof normalizeIphoneDayPointsFromJsonText === 'function', 'normalizeIphoneDayPointsFromJsonText is missing');
    const points = normalizeIphoneDayPointsFromJsonText(sampleJsonText, date);
    _selfTestAssert(Array.isArray(points), 'points is not an array');
    _selfTestAssert(points.length >= 1, 'no points produced');

    // 2) GPX builder
    _selfTestAssert(typeof buildGpxTrack === 'function', 'buildGpxTrack is missing');
    const xml = buildGpxTrack({ name: `selftest-${date}`, points });
    _selfTestAssert(typeof xml === 'string' && xml.includes('<gpx'), 'GPX xml is invalid');
    _selfTestAssert(xml.includes('<trkpt'), 'GPX has no trkpt');

    // 3) export to Drive
    _selfTestAssert(typeof exportDailyGpxToDrive === 'function', 'exportDailyGpxToDrive is missing');
    const result = exportDailyGpxToDrive({ outputFolderId: folder.getId(), date, points });
    _selfTestAssert(result && result.fileName, 'export result missing');
    _selfTestAssert(!result.skipped, 'export unexpectedly skipped');

    const file = DriveApp.getFileById(result.fileId);
    const content = file.getBlob().getDataAsString('UTF-8');
    _selfTestAssert(content.includes('<gpx'), 'exported file is not GPX');
    _selfTestAssert(content.includes('<trkpt'), 'exported GPX has no trkpt');

    Logger.log('SelfTest OK: folder=%s file=%s', folder.getName(), result.fileName);
    return { ok: true, folderId: folder.getId(), fileId: result.fileId, fileName: result.fileName, points: points.length };
  } catch (e) {
    Logger.log('SelfTest FAILED: %s', String(e && e.message ? e.message : e));
    throw e;
  } finally {
    // Cleanup: move folder to trash to avoid clutter
    try {
      folder.setTrashed(true);
    } catch (_) {
      // ignore
    }
  }
}

// Expose for Apps Script runtime
globalThis.runSelfTest = runSelfTest;

if (typeof module !== 'undefined') {
  module.exports = { runSelfTest };
}


