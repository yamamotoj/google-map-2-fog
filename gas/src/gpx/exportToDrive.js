const { buildGpxTrack } = require('./builder');

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

  const xml = buildGpxTrack({ name: fileName.replace('.gpx', ''), points });
  const file = folder.createFile(fileName, xml, MimeType.PLAIN_TEXT);
  return { skipped: false, fileId: file.getId(), fileName };
}

if (typeof module !== 'undefined') {
  module.exports = { exportDailyGpxToDrive };
}


