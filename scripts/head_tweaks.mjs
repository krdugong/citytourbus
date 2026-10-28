// Head hygiene for the hand-written pages (home, compare, route checkers, legal pages), using the same pieces as the
// generated city pages (scripts/head-bits.mjs):
// - Google Fonts stylesheet loads without blocking the first paint; the common Noto Sans KR request only asks for
//   the three weights the CSS uses. Pages with other font families keep their family list.
// - preconnect to fonts.gstatic.com.
// - favicon.ico / SVG / apple-touch-icon links on every page.
// Safe to run again. Usage (from repo root): node scripts/head_tweaks.mjs
import fs from 'node:fs';
import path from 'node:path';
import { FONT_URL, ICONS, PRECONNECT, fontLinks } from './head-bits.mjs';

const OLD_COMMON = 'https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;600;700;800&display=swap';
const BLOCKING_FONT = /<link href="(https:\/\/fonts\.googleapis\.com\/css2\?[^"]+)" rel="stylesheet">/g;
const SKIP = new Set(['node_modules', '.git', 'astro-site', 'scripts']);

const files = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith('.html')) files.push(p);
  }
})(process.cwd());

let changed = 0;
for (const f of files) {
  let html = fs.readFileSync(f, 'utf8');
  const before = html;
  html = html.replace(BLOCKING_FONT, (_, href) => fontLinks(href === OLD_COMMON ? FONT_URL : href));
  if (html.includes('fonts.googleapis.com') && !html.includes('fonts.gstatic.com')) {
    html = html.replace('<link rel="preconnect" href="https://fonts.googleapis.com">', PRECONNECT);
  }
  if (!/rel="icon"/.test(html)) html = html.replace('</head>', `${ICONS}\n</head>`);
  else if (!html.includes('favicon.ico')) html = html.replace(/<link rel="icon" type="image\/svg\+xml" href="\/favicon\.svg">/, ICONS);
  if (html !== before) { fs.writeFileSync(f, html); changed++; }
}
console.log('head tweaks:', files.length, 'pages checked,', changed, 'updated');
