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

/**
 * Create a one-time time-driven trigger after N minutes.
 * Useful for retry scheduling within the same day.
 * @param {string} functionName
 * @param {{minutesFromNow?: number}} options
 */
function createOneTimeTrigger(functionName, { minutesFromNow = 2 } = {}) {
  if (typeof ScriptApp === 'undefined') {
    throw new Error('ScriptApp is not available (must run in Apps Script)');
  }
  const mins = Math.max(1, Number.parseInt(String(minutesFromNow), 10) || 2);
  // ensure only one pending retry trigger exists
  deleteTriggersForHandler(functionName);
  ScriptApp.newTrigger(functionName).timeBased().after(mins * 60 * 1000).create();
}

if (typeof module !== 'undefined') {
  module.exports = { listTriggers, deleteTriggersForHandler, createDailyTrigger, createOneTimeTrigger };
}


