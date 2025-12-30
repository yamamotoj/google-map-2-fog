// Apps Script runtime loads all .gs files into the same global scope.
// Avoid redeclaring identifiers that may already exist globally (e.g. buildGpxTrack).
// Also avoid evaluating require() at load time (Apps Script has no require and file order is not guaranteed).
function _resolveBuildGpxTrack() {
  if (typeof buildGpxTrack !== 'undefined') return buildGpxTrack;
  if (typeof require !== 'undefined') return require('./builder').buildGpxTrack;
  throw new Error('buildGpxTrack is not available');
}

function getFolderById(folderId) {
  if (typeof DriveApp === 'undefined') {
    throw new Error('DriveApp is not available (must run in Apps Script)');
  }
  return DriveApp.getFolderById(folderId);
}

function fileExistsByName(folder, fileName) {
  const files = folder.getFilesByName(fileName);
  return files.hasNext();
}

function findFileByName(folder, fileName) {
  const files = folder.getFilesByName(fileName);
  return files.hasNext() ? files.next() : null;
}

function _resolveAppendHelpers() {
  const create = typeof createEmptyGpx !== 'undefined' ? createEmptyGpx : (typeof require !== 'undefined' ? require('./append').createEmptyGpx : null);
  const hasDay = typeof gpxHasDay !== 'undefined' ? gpxHasDay : (typeof require !== 'undefined' ? require('./append').gpxHasDay : null);
  const buildSeg = typeof buildDayTrkseg !== 'undefined' ? buildDayTrkseg : (typeof require !== 'undefined' ? require('./append').buildDayTrkseg : null);
  const append = typeof appendTrksegToGpxXml !== 'undefined' ? appendTrksegToGpxXml : (typeof require !== 'undefined' ? require('./append').appendTrksegToGpxXml : null);
  if (!create || !hasDay || !buildSeg || !append) throw new Error('GPX append helpers are not available');
  return { create, hasDay, buildSeg, append };
}

/**
 * Export a daily GPX file to Drive output folder (idempotent: skip if exists).
 * @returns {{skipped:boolean,fileId?:string,fileName:string}}
 */
function exportDailyGpxToDrive({ outputFolderId, date, points }) {
  const folder = getFolderById(outputFolderId);
  const fileName = `timeline-${date}.gpx`;
  if (fileExistsByName(folder, fileName)) {
    return { skipped: true, fileName };
  }

  const xml = _resolveBuildGpxTrack()({ name: fileName.replace('.gpx', ''), points });
  const file = folder.createFile(fileName, xml, MimeType.PLAIN_TEXT);
  return { skipped: false, fileId: file.getId(), fileName };
}

/**
 * Append one day as a trkseg into a single GPX file in Drive (idempotent by marker).
 * @returns {{skipped:boolean,fileId:string,fileName:string}}
 */
function appendDayGpxToDrive({ outputFolderId, outputFileName, date, points }) {
  const folder = getFolderById(outputFolderId);
  const fileName = outputFileName || 'timeline-all.gpx';
  const { create, hasDay, buildSeg, append } = _resolveAppendHelpers();

  let file = findFileByName(folder, fileName);
  if (!file) {
    const initial = create({ name: fileName.replace(/\.gpx$/i, '') });
    file = folder.createFile(fileName, initial, MimeType.PLAIN_TEXT);
  }

  const existing = file.getBlob().getDataAsString('UTF-8');
  if (hasDay(existing, date)) {
    return { skipped: true, fileId: file.getId(), fileName };
  }

  const seg = buildSeg({ date, points });
  const updated = append(existing, seg);
  file.setContent(updated);
  return { skipped: false, fileId: file.getId(), fileName };
}

if (typeof module !== 'undefined') {
  module.exports = { exportDailyGpxToDrive, appendDayGpxToDrive };
}


