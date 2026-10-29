// One-time road geometry for each stop→next-stop segment (OSRM demo server), cached in data/simulator/geo/<city>.json.
// Re-run after changing stop coordinates; segments whose endpoints are unchanged are kept from the cache.
import fs from 'node:fs';
import path from 'node:path';

const src = fs.readFileSync('simulator-data.js', 'utf8');
const data = JSON.parse(src.slice(src.indexOf('{'), src.lastIndexOf('}') + 1));
const dir = 'data/simulator/geo';
fs.mkdirSync(dir, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const r5 = x => Math.round(x * 1e5) / 1e5;
const only = process.argv[2];

for (const [key, city] of Object.entries(data)) {
  if (only && key !== only) continue;
  const file = path.join(dir, `${key}.json`);
  const cache = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
  const out = {};
  let fetched = 0, kept = 0, failed = 0;
  for (const [rk, r] of Object.entries(city.routes)) {
    out[rk] = [];
    for (let i = 0; i < r.stops.length; i++) {
      const a = r.stops[i], b = r.stops[(i + 1) % r.stops.length];
      const sig = `${r5(a.lat)},${r5(a.lng)}>${r5(b.lat)},${r5(b.lng)}`;
      const old = cache[rk]?.[i];
      if (old && old.sig === sig && old.c?.length > 1) { out[rk][i] = old; kept++; continue; }
      let seg = { sig, d: null, c: [[r5(a.lat), r5(a.lng)], [r5(b.lat), r5(b.lng)]] };
      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${a.lng},${a.lat};${b.lng},${b.lat}?overview=simplified&geometries=geojson`;
        const res = await fetch(url, { headers: { 'User-Agent': 'CITYTOURBUS.KR build (+https://www.citytourbus.kr/)' } });
        const j = await res.json();
        const rt = j.routes?.[0];
        if (j.code === 'Ok' && rt?.geometry?.coordinates?.length > 1) {
          const c = rt.geometry.coordinates.map(([lng, lat]) => [r5(lat), r5(lng)]);
          // snap ends to the stop markers so the bus leaves from / arrives at the pin
          c[0] = [r5(a.lat), r5(a.lng)]; c[c.length - 1] = [r5(b.lat), r5(b.lng)];
          seg = { sig, d: Math.round(rt.distance), c };
          fetched++;
        } else failed++;
      } catch (e) { failed++; }
      out[rk][i] = seg;
      await sleep(250);
    }
  }
  fs.writeFileSync(file, JSON.stringify(out));
  console.log(`${key}: fetched ${fetched}, cached ${kept}, failed ${failed}`);
}
