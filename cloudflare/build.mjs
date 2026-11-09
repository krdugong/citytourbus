// Turns vercel.json into Cloudflare's config, so vercel.json stays the one place to edit
// redirects and headers. Runs automatically before `wrangler dev` / `wrangler deploy`.
//
// Writes (all git-ignored):
//   _redirects               plain path redirects
//   _headers                 per-path response headers
//   cloudflare/generated.json  /compare?city= redirects and the "/" headers, read by the worker
//
// Anything in vercel.json this script does not understand stops the build, so a new
// kind of rule never silently goes missing on Cloudflare.

import { readFileSync, writeFileSync } from 'node:fs';

const vercel = JSON.parse(readFileSync('vercel.json', 'utf8'));
const APEX_HOST = 'citytourbus.kr'; // handled by the separate apex worker (cloudflare/apex)

function fail(msg, rule) {
  console.error(`cloudflare/build.mjs: ${msg}\n${JSON.stringify(rule)}`);
  process.exit(1);
}

// Vercel "(.*)" at the end of a path becomes Cloudflare's "*"
function toPattern(source, rule) {
  const p = source.replace(/\(\.\*\)$/, '*');
  if (/[():]/.test(p)) fail('unsupported path pattern', rule);
  return p;
}

const redirectLines = [];
const compareRedirects = {};

for (const r of vercel.redirects ?? []) {
  const status = r.statusCode ?? (r.permanent === false ? 307 : 308);
  if (r.has) {
    const [cond] = r.has;
    if (r.has.length === 1 && cond.type === 'host' && cond.value === APEX_HOST) continue;
    if (r.has.length === 1 && cond.type === 'query' && cond.key === 'city' && r.source === '/compare') {
      compareRedirects[cond.value] = { to: r.destination, status };
      continue;
    }
    fail('unsupported redirect condition', r);
  }
  redirectLines.push(`${toPattern(r.source, r)} ${r.destination} ${status}`);
}

const headerBlocks = [];
let rootHeaders = {};
let globalHeaders = {}; // the "/(.*)" rule; the worker adds these to responses it builds itself
for (const h of vercel.headers ?? []) {
  const pattern = toPattern(h.source, h);
  const asObject = Object.fromEntries(h.headers.map(({ key, value }) => [key, value]));
  if (pattern === '/') rootHeaders = asObject;
  if (pattern === '/*') globalHeaders = asObject;
  headerBlocks.push([pattern, ...h.headers.map(({ key, value }) => `  ${key}: ${value}`)].join('\n'));
}

// The worker handles these rewrites itself; stop if vercel.json gains one it doesn't know.
const KNOWN_REWRITES = new Set(['/ -> /index-v2.html', '/compare -> /api/compare', '/compare/:path* -> /api/compare']);
for (const r of vercel.rewrites ?? []) {
  if (!KNOWN_REWRITES.has(`${r.source} -> ${r.destination}`)) fail('unknown rewrite: add it to cloudflare/worker.js', r);
}

writeFileSync('_redirects', redirectLines.join('\n') + '\n');
writeFileSync('_headers', headerBlocks.join('\n\n') + '\n');
writeFileSync('cloudflare/generated.json', JSON.stringify({ compareRedirects, rootHeaders, globalHeaders }, null, 2) + '\n');

console.log(
  `cloudflare/build.mjs: ${redirectLines.length} redirects, ${Object.keys(compareRedirects).length} compare?city= redirects, ${headerBlocks.length} header rules`
);
