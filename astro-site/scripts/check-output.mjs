import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'csv-parse/sync';

const rows = parse(readFileSync('data/citybus.csv','utf8'),{columns:true,bom:true,skip_empty_lines:true});
const cities = rows.filter(r => r.row_type === 'city');
const errors = [];
const htmlFiles = [];
function walk(dir) { for (const entry of readdirSync(dir,{withFileTypes:true})) { const path = resolve(dir,entry.name); if (entry.isDirectory()) walk(path); else if (entry.name.endsWith('.html')) htmlFiles.push(path); } }
walk('dist');
for (const file of htmlFiles) if (readFileSync(file,'utf8').includes('<!--')) errors.push(`HTML 주석: ${file}`);
const sitemap = readFileSync('dist/sitemap-0.xml','utf8');
const home = readFileSync('dist/index.html','utf8');
const canonicals = new Set();
for (const city of cities) {
  const file = resolve(`dist/city/${city.city_slug}/index.html`);
  if (!existsSync(file)) { errors.push(`도시 페이지 누락: ${city.city_slug}`); continue; }
  const html = readFileSync(file,'utf8');
  if (!html.includes(`<h1`) || (html.match(/<h1\b/g)||[]).length !== 1) errors.push(`H1 오류: ${city.city_slug}`);
  if (!html.includes(city.city)) errors.push(`도시명 누락: ${city.city_slug}`);
  const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
  if (!canonical || canonicals.has(canonical)) errors.push(`canonical 오류: ${city.city_slug}`);
  canonicals.add(canonical);
  if (!sitemap.includes(`/city/${city.city_slug}/`)) errors.push(`sitemap 누락: ${city.city_slug}`);
  if (!home.includes(`/city/${city.city_slug}/`)) errors.push(`홈 링크 누락: ${city.city_slug}`);
  if (rows.some(r => r.row_type === 'product' && r.city_slug === city.city_slug && r.booking_link) && !html.includes('sponsored nofollow noopener')) errors.push(`예약 rel 누락: ${city.city_slug}`);
  if (!html.includes('자주 묻는 질문')) errors.push(`FAQ 누락: ${city.city_slug}`);
  const faqRows = rows.filter(r => r.row_type === 'faq' && r.city_slug === city.city_slug);
  const scripts = [...html.matchAll(/<script type="application\/ld\+json">([^<]+)<\/script>/g)].map(m => JSON.parse(m[1]));
  const faqSchema = scripts.find(s => s['@type'] === 'FAQPage');
  if (faqRows.length && (!faqSchema || faqSchema.mainEntity.length !== faqRows.length)) errors.push(`FAQPage 누락: ${city.city_slug}`);
  for (const [i,faq] of faqRows.entries()) {
    if (!html.includes(faq.faq_q) || !html.includes(faq.faq_a)) errors.push(`FAQ 문자열 누락: ${city.city_slug}`);
    if (faqSchema?.mainEntity[i]?.name !== faq.faq_q || faqSchema?.mainEntity[i]?.acceptedAnswer?.text !== faq.faq_a) errors.push(`FAQPage 문자열 불일치: ${city.city_slug}`);
  }
  for (const p of rows.filter(r => r.row_type === 'product' && r.city_slug === city.city_slug)) if (!html.includes(p.product_name)) errors.push(`상품 누락: ${p.product_id}`);
  for (const image of html.matchAll(/<img\b[^>]*>/g)) if (!/\bwidth=/.test(image[0]) || !/\bheight=/.test(image[0]) || !/\balt=/.test(image[0])) errors.push(`이미지 속성 누락: ${city.city_slug}`);
}
if (!existsSync('dist/robots.txt') || !existsSync('dist/rss.xml') || !existsSync('dist/sitemap-index.xml')) errors.push('robots/RSS/sitemap 누락');
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log(`출력 검증 완료: 도시 ${cities.length}개, HTML ${htmlFiles.length}개`);
