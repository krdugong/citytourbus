// Puts the analytics tag (gtag.js + deferred /analytics.js) right after <head> in every static page, replacing any
// older form of it, plus the AdSense tag and /ads.txt when ADSENSE_CLIENT is set. Safe to run again. Usage (from repo root): node scripts/add_analytics.mjs
import fs from 'node:fs';
import path from 'node:path';
import { TAG, TAG_RE, ADSENSE_CLIENT, ADS_TAG, ADS_RE } from './head-bits.mjs';

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
  if (!html.includes(TAG)) {
    if (TAG_RE.test(html)) html = html.replace(TAG_RE, TAG);
    else {
      const m = html.match(/<head[^>]*>/i);
      if (!m) throw new Error(`no <head> in ${f}`);
      html = html.replace(m[0], m[0] + '\n' + TAG);
    }
  }
  // AdSense (only when ADSENSE_CLIENT is set): right after the analytics tag.
  html = html.replace(ADS_RE, '');
  if (ADS_TAG) html = html.replace(TAG, TAG + ADS_TAG);
  if (html !== before) { fs.writeFileSync(f, html); changed++; }
}
console.log('analytics tag:', files.length, 'pages checked,', changed, 'updated');

// /ads.txt names the AdSense account allowed to sell ads here; it only exists once the account id is set.
const pub = ADSENSE_CLIENT.replace(/^ca-/, '');
if (pub) fs.writeFileSync('ads.txt', `google.com, ${pub}, DIRECT, f08c47fec0942fa0\n`);
else if (fs.existsSync('ads.txt')) fs.rmSync('ads.txt');
console.log('adsense:', pub ? `on (${pub}), ads.txt written` : 'off (ADSENSE_CLIENT empty)');
