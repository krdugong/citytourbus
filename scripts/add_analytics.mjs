// Puts the Google Analytics tag (gtag.js + /analytics.js) right after <head> in every static page.
// Replaces the old inline gtag snippet. Safe to run again. Usage (from repo root): node scripts/add_analytics.mjs
import fs from 'node:fs';
import path from 'node:path';

export const TAG = '<script async src="https://www.googletagmanager.com/gtag/js?id=G-BS2Y7SJ7BT"></script><script src="/analytics.js"></script>';
const SKIP = new Set(['node_modules', '.git', 'astro-site', 'scripts']);
const OLD = /<!-- Google tag \(gtag\.js\) -->\s*<script async src="https:\/\/www\.googletagmanager\.com\/gtag\/js\?id=G-[A-Z0-9]+"><\/script>\s*<script>[\s\S]*?<\/script>\s*/;

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
  html = html.replace(OLD, '');
  if (!html.includes('src="/analytics.js"')) {
    const m = html.match(/<head[^>]*>/i);
    if (!m) throw new Error(`no <head> in ${f}`);
    html = html.replace(m[0], m[0] + '\n' + TAG);
  }
  if (html !== before) { fs.writeFileSync(f, html); changed++; }
}
console.log('analytics tag:', files.length, 'pages checked,', changed, 'updated');
