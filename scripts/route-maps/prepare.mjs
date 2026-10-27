// Prepares route-map render specs from data/route-maps/*.json.
// For each route it asks the public OSRM server for a road path through the stops (in order, looping
// back to the first stop), downloads the OpenStreetMap tiles that cover the map, and writes
// scripts/route-maps/.cache/specs.json for render.swift. Network results are cached in .cache/.
// Usage (from repo root): node scripts/route-maps/prepare.mjs [slug]
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const CACHE = path.join(ROOT, 'scripts/route-maps/.cache');
const UA = 'citytourbus.kr route map builder (https://www.citytourbus.kr)';
const W = 1080, H = 1080, TILE = 256;
const BOX = { left: 70, right: 70, top: 200, bottom: 190 }; // space kept for title and legend
fs.mkdirSync(path.join(CACHE, 'tiles'), { recursive: true });
fs.mkdirSync(path.join(CACHE, 'osrm'), { recursive: true });

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const lon2x = (lng, z) => (lng + 180) / 360 * TILE * 2 ** z;
const lat2y = (lat, z) => { const r = lat * Math.PI / 180; return (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * TILE * 2 ** z; };

const hav = (a, b) => {
  const R = 6371000, r = Math.PI / 180, dLat = (b.lat - a.lat) * r, dLng = (b.lng - a.lng) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};
async function osrmLeg(a, b) {
  const coords = `${a.lng},${a.lat};${b.lng},${b.lat}`;
  const file = path.join(CACHE, 'osrm', `leg-${coords.replace(/[^0-9.,;-]/g, '')}.json`);
  if (!fs.existsSync(file)) {
    const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`, { headers: { 'User-Agent': UA } });
    if (!res.ok) throw new Error(`OSRM ${res.status}`);
    fs.writeFileSync(file, await res.text());
    await sleep(1100); // be polite to the public demo server
  }
  const j = JSON.parse(fs.readFileSync(file, 'utf8'));
  return j.code === 'Ok' ? j.routes[0] : null;
}
// Road path stop by stop. A leg that detours more than DETOUR x the straight distance (tunnels,
// ring roads, one-way loops) is drawn as a straight line instead, so the map never wanders off.
const DETOUR = 2.2;
async function roadPath(route) {
  const pts = [...route.stops, ...(route.loop === false ? [] : [route.stops[0]])];
  const out = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], straight = hav(a, b);
    const leg = straight < 30 ? null : await osrmLeg(a, b);
    if (leg && leg.distance <= Math.max(DETOUR * straight, straight + 400)) out.push(...leg.geometry.coordinates.map(([lng, lat]) => ({ lat, lng })));
    else out.push(b);
  }
  return out;
}

async function tile(z, x, y) {
  const file = path.join(CACHE, 'tiles', `${z}-${x}-${y}.png`);
  if (!fs.existsSync(file)) {
    const res = await fetch(`https://tile.openstreetmap.org/${z}/${x}/${y}.png`, { headers: { 'User-Agent': UA } });
    if (!res.ok) throw new Error(`tile ${z}/${x}/${y}: ${res.status}`);
    fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
    await sleep(150);
  }
  return file;
}

const only = process.argv[2];
const specs = [];
for (const f of fs.readdirSync(path.join(ROOT, 'data/route-maps')).filter(f => f.endsWith('.json'))) {
  const m = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/route-maps', f), 'utf8'));
  if (only && m.slug !== only) continue;
  const allLines = [];
  for (const r of m.routes) allLines.push({ route: r, geo: r.road === false ? [...r.stops, r.stops[0]] : await roadPath(r) });
  // one overview map with every route, plus one zoomed map per route when there is more than one
  const variants = [{ suffix: '', lines: allLines, title: m.title, sub: m.sub || '', labels: m.labels || [] }];
  if (allLines.length > 1) for (const l of allLines) variants.push({ suffix: `-${l.route.key}`, lines: [l], title: m.title.replace(/노선도$/, `${l.route.title || l.route.name} 노선도`), sub: l.route.sub || '', labels: [] });
  for (const v of variants) {
  const lines = v.lines;
  const all = lines.flatMap(l => l.geo);
  // largest zoom where everything fits inside the map box
  const availW = W - BOX.left - BOX.right, availH = H - BOX.top - BOX.bottom;
  let z = 17;
  for (; z > 3; z--) {
    const xs = all.map(p => lon2x(p.lng, z)), ys = all.map(p => lat2y(p.lat, z));
    if (Math.max(...xs) - Math.min(...xs) <= availW && Math.max(...ys) - Math.min(...ys) <= availH) break;
  }
  const xs = all.map(p => lon2x(p.lng, z)), ys = all.map(p => lat2y(p.lat, z));
  const cx = (Math.max(...xs) + Math.min(...xs)) / 2, cy = (Math.max(...ys) + Math.min(...ys)) / 2;
  const ox = cx - (BOX.left + availW / 2), oy = cy - (BOX.top + availH / 2); // world px at canvas (0,0)
  const toPx = (p) => [lon2x(p.lng, z) - ox, lat2y(p.lat, z) - oy];
  const tiles = [];
  for (let tx = Math.floor(ox / TILE); tx * TILE < ox + W; tx++)
    for (let ty = Math.floor(oy / TILE); ty * TILE < oy + H; ty++)
      tiles.push({ file: await tile(z, tx, ty), x: tx * TILE - ox, y: ty * TILE - oy });
  specs.push({
    out: `img/${m.slug}/${m.slug}-map${v.suffix}.jpg`, w: W, h: H, title: v.title, sub: v.sub, zoom: z, tiles,
    routes: lines.map(({ route, geo }, i) => ({
      name: route.name, color: route.color, path: geo.map(toPx),
      stops: route.stops.map((s, k) => ({ n: k + 1, p: toPx(s) })), offset: i
    })),
    labels: v.labels.map(l => ({ name: l.name, p: toPx(l) })),
    note: m.note || '정류장 순서 기준 참고용 노선도 · 실제 운행 경로와 다를 수 있음'
  });
  console.log(m.slug + v.suffix, 'zoom', z, 'tiles', tiles.length);
  }
}
fs.writeFileSync(path.join(CACHE, 'specs.json'), JSON.stringify(specs));
