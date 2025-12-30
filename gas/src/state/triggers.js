function listTriggers() {
  if (typeof ScriptApp === 'undefined') {
    throw new Error('ScriptApp is not available (must run in Apps Script)');
  }
  return ScriptApp.getProjectTriggers();
}

function deleteTriggersForHandler(functionName) {
  const triggers = listTriggers();
  for (const t of triggers) {
    if (t.getHandlerFunction && t.getHandlerFunction() === functionName) {
      ScriptApp.deleteTrigger(t);
    }
  }
}

/**
 * Create a daily time-driven trigger for a handler function.
 * @param {string} functionName
 * @param {{hour?: number}} options
 */
function createDailyTrigger(functionName, { hour = 3 } = {}) {
  if (typeof ScriptApp === 'undefined') {
    throw new Error('ScriptApp is not available (must run in Apps Script)');
  }
  deleteTriggersForHandler(functionName);
  ScriptApp.newTrigger(functionName).timeBased().everyDays(1).atHour(hour).create();
}

if (typeof module !== 'undefined') {
  module.exports = { listTriggers, deleteTriggersForHandler, createDailyTrigger };
}


