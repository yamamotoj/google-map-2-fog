/**
 * Local helper: convert iPhone Timeline export JSON -> GPX for a single day.
 *
 * Usage:
 *   node tools/local-gpx-one-day.js --input tools/fixtures/location-history.json --date 2010-12-20 --output /tmp/timeline-2010-12-20.gpx
 */

const fs = require('node:fs');
const path = require('node:path');

const { buildGpxTrack } = require('../gas/src/gpx/builder');

function parseArgs(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--input') out.input = argv[++i];
    else if (a === '--date') out.date = argv[++i];
    else if (a === '--output') out.output = argv[++i];
  }
  return out;
}

function parseGeo(s) {
  // "geo:35.692916,139.699184"
  if (!s || typeof s !== 'string') return null;
  const m = s.match(/^geo:([\-0-9.]+),([\-0-9.]+)$/);
  if (!m) return null;
  const lat = Number(m[1]);
  const lng = Number(m[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

function isSameJstDate(isoWithOffset, dateYmd) {
  // Input has "+09:00" already. Compare by the first 10 chars in that local form.
  return typeof isoWithOffset === 'string' && isoWithOffset.slice(0, 10) === dateYmd;
}

function extractPointsForDate(records, dateYmd) {
  const pts = [];
  for (const r of records) {
    const startTime = r.startTime;
    const endTime = r.endTime;

    if (r.visit?.topCandidate?.placeLocation) {
      if (!isSameJstDate(startTime, dateYmd) && !isSameJstDate(endTime, dateYmd)) continue;
      const g = parseGeo(r.visit.topCandidate.placeLocation);
      if (!g) continue;
      pts.push({ lat: g.lat, lng: g.lng, time: new Date(startTime).toISOString() });
      continue;
    }

    if (r.activity?.start && r.activity?.end) {
      if (!isSameJstDate(startTime, dateYmd) && !isSameJstDate(endTime, dateYmd)) continue;
      const s = parseGeo(r.activity.start);
      const e = parseGeo(r.activity.end);
      if (s) pts.push({ lat: s.lat, lng: s.lng, time: new Date(startTime).toISOString() });
      if (e) pts.push({ lat: e.lat, lng: e.lng, time: new Date(endTime).toISOString() });
    }
  }
  pts.sort((a, b) => (a.time < b.time ? -1 : a.time > b.time ? 1 : 0));
  return pts;
}

function main() {
  const { input, date, output } = parseArgs(process.argv);
  if (!input || !date || !output) {
    console.error('Usage: --input <path> --date YYYY-MM-DD --output <path>');
    process.exit(2);
  }
  const raw = fs.readFileSync(input, 'utf-8');
  const json = JSON.parse(raw);
  if (!Array.isArray(json)) {
    console.error('Expected top-level JSON array');
    process.exit(2);
  }
  const points = extractPointsForDate(json, date);
  const xml = buildGpxTrack({ name: `timeline-${date}`, points });
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, xml, 'utf-8');
  console.log(`Wrote ${points.length} points -> ${output}`);
}

if (require.main === module) main();


