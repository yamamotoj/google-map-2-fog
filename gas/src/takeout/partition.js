function formatJstYyyyMmDd(date) {
  if (typeof Utilities !== 'undefined' && typeof Utilities.formatDate === 'function') {
    return Utilities.formatDate(date, 'Asia/Tokyo', 'yyyy-MM-dd');
  }
  return date.toISOString().slice(0, 10);
}

/**
 * Partition points by JST date (YYYY-MM-DD).
 * @param {Array<{lat:number,lng:number,time:string}>} points
 * @returns {Record<string, Array<{lat:number,lng:number,time:string}>>}
 */
function partitionPointsByJstDate(points) {
  const map = {};
  for (const p of points || []) {
    if (!p.time) continue;
    const d = new Date(p.time);
    if (Number.isNaN(d.getTime())) continue;
    const key = formatJstYyyyMmDd(d);
    if (!map[key]) map[key] = [];
    map[key].push(p);
  }
  return map;
}

/**
 * Filter points by a single JST date (YYYY-MM-DD).
 * @param {Array<{lat:number,lng:number,time:string}>} points
 * @param {string} date
 * @returns {Array<{lat:number,lng:number,time:string}>}
 */
function filterPointsByJstDate(points, date) {
  const out = [];
  for (const p of points || []) {
    if (!p.time) continue;
    const d = new Date(p.time);
    if (Number.isNaN(d.getTime())) continue;
    const key = formatJstYyyyMmDd(d);
    if (key === date) out.push(p);
  }
  return out;
}

if (typeof module !== 'undefined') {
  module.exports = { partitionPointsByJstDate, filterPointsByJstDate, formatJstYyyyMmDd };
}


