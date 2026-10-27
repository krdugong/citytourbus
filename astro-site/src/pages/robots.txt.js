import { absolute } from '../lib/site.mjs';
export function GET() { return new Response(`User-agent: *\nAllow: /\nSitemap: ${absolute('/sitemap-index.xml')}\n`,{headers:{'Content-Type':'text/plain; charset=utf-8'}}); }
