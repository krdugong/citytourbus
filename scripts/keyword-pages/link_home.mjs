// Rebuilds the homepage city links (index.html and index-v2.html stay identical).
// - Regenerates `function href(slug){...}` from the keyword pages in data/keyword-pages
//   (city slug -> page), falling back to old <city>-city-tour-bus.html guides, then /compare?city=.
// - Re-renders the static "popular" and "regions" chip HTML with that same function.
// - Drops old /api/compare rewrites in vercel.json that would shadow a keyword page.
// Usage (from repo root): node scripts/keyword-pages/link_home.mjs
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const pages = fs.readdirSync(path.join(ROOT, 'data/keyword-pages')).filter(f => f.endsWith('.json') && !f.startsWith('_'))
  .map(f => JSON.parse(fs.readFileSync(path.join(ROOT, 'data/keyword-pages', f), 'utf8')).slug);
const cityOf = (slug) => slug.replace(/-(big-bus|city-tour-bus)$/, '');

let html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const gStart = html.indexOf('const groups=');
const gEnd = html.indexOf('const countryNames=');
if (gStart < 0 || gEnd < 0) throw new Error('groups block not found');
const groups = new Function(html.slice(gStart, gEnd) + '; return groups;')();
const all = Object.values(groups).flat();

const map = {};
for (const [slug] of all) {
  const kw = pages.find(p => cityOf(p) === slug);
  if (kw) map[slug] = `/${kw}`;
  else if (fs.existsSync(path.join(ROOT, `${slug}-city-tour-bus.html`))) map[slug] = `/${slug}-city-tour-bus`;
}
const href = (slug) => map[slug] || '/compare?city=' + slug;
const fn = `function href(slug){const M=${JSON.stringify(map)};return M[slug]||'/compare?city='+slug}`;

// replace whatever href function is there (also repairs a damaged one) up to its fixed ending
const fStart = html.indexOf('function href(sl');
const tail = "'/compare?city='+slug}";
const fEnd = html.indexOf(tail, fStart);
if (fStart < 0 || fEnd < 0) throw new Error('href function not found');
html = html.slice(0, fStart) + fn + html.slice(fEnd + tail.length);

const popular = ['paris', 'london', 'rome', 'barcelona', 'dubai', 'new-york'];
const popHtml = popular.map(s => { const x = all.find(c => c[0] === s); return `<a href="${href(s)}"><div><b>${x[1]}</b><small>${x[2]}</small></div><div class="go">운영사 비교 →</div></a>`; }).join('');
const regHtml = Object.entries(groups).map(([name, arr]) => `<div><div class="regionhd"><h3>${name}</h3><span>${arr.length}개 도시</span></div><div class="citygrid">${arr.map(x => `<a class="chip" href="${href(x[0])}"><b>${x[1]}</b><span>${x[2]}</span></a>`).join('')}</div></div>`).join('');
const swapInner = (h, open, close, inner) => {
  const a = h.indexOf(open); if (a < 0) throw new Error(`missing ${open}`);
  const b = h.indexOf(close, a + open.length); if (b < 0) throw new Error(`missing end of ${open}`);
  return h.slice(0, a + open.length) + inner + h.slice(b);
};
html = swapInner(html, '<div class="pop" id="popular">', '</div></section>', popHtml);
html = swapInner(html, '<div class="regions" id="regions">', '</div></section>', regHtml);

// sanity: every inline script must still parse
for (const m of html.matchAll(/<script>([\s\S]*?)<\/script>/g)) new Function(m[1]);
for (const f of ['index.html', 'index-v2.html']) fs.writeFileSync(path.join(ROOT, f), html);

const vp = path.join(ROOT, 'vercel.json');
const v = JSON.parse(fs.readFileSync(vp, 'utf8'));
const before = v.rewrites.length;
v.rewrites = v.rewrites.filter(r => !pages.includes(r.source.replace(/^\//, '')));
if (v.rewrites.length !== before) fs.writeFileSync(vp, JSON.stringify(v, null, 2) + '\n');
console.log('home links:', Object.keys(map).length, 'cities mapped; rewrites removed:', before - v.rewrites.length);
