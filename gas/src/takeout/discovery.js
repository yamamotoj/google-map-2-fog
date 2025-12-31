/**
 * List JSON files under a Drive folder (recursive).
 * Apps Script only.
 */
function listJsonFilesRecursive(folderId) {
  if (typeof DriveApp === 'undefined') {
    throw new Error('DriveApp is not available (must run in Apps Script)');
  }
  const root = DriveApp.getFolderById(folderId);
  const out = [];

  function walk(folder) {
    const files = folder.getFiles();
    while (files.hasNext()) {
      const f = files.next();
      const name = f.getName();
      if (name.toLowerCase().endsWith('.json')) {
        out.push(f);
      }
    }
    const folders = folder.getFolders();
    while (folders.hasNext()) {
      walk(folders.next());
    }
  }

  walk(root);
  return out;
}

if (typeof module !== 'undefined') {
  module.exports = { listJsonFilesRecursive };
}


