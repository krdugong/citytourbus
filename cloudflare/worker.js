// Cloudflare Worker for www.citytourbus.kr.
// Static files are served straight from assets; this code only runs for the paths listed in
// wrangler.jsonc "run_worker_first", which mirror the rewrites in vercel.json.

import generated from './generated.json';
import { renderCompare } from './compare.js';
import { placeSearch } from './place-search.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // vercel.json: "/" -> "/index-v2.html"
    if (path === '/') {
      const res = await env.ASSETS.fetch(new Request(new URL('/index-v2', url), request));
      return withHeaders(res, generated.rootHeaders);
    }

    // vercel.json: /compare?city=X redirects. Without a matching city, Vercel serves the
    // static compare.html (files win over rewrites there), so do the same.
    if (path === '/compare') {
      const hit = generated.compareRedirects[url.searchParams.get('city')];
      if (hit) return withHeaders(Response.redirect(new URL(hit.to + url.search, url).toString(), hit.status), generated.globalHeaders);
      return env.ASSETS.fetch(request);
    }

    // Static files get vercel.json's site-wide headers from _headers; responses built here need them added.
    // vercel.json: /compare/:path* -> /api/compare
    if (path === '/api/compare' || path.startsWith('/compare/')) {
      return withHeaders(await renderCompare(request, env), generated.globalHeaders);
    }

    if (path === '/api/place-search') return withHeaders(await placeSearch(request, ctx), generated.globalHeaders);

    return env.ASSETS.fetch(request);
  },
};

function withHeaders(res, headers) {
  const out = new Response(res.body, res);
  for (const [k, v] of Object.entries(headers)) out.headers.set(k, v);
  return out;
}
