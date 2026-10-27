// Builds keyword landing pages (e.g. /hong-kong-big-bus) from data/keyword-pages/*.json.
// Usage (from repo root): node scripts/keyword-pages/build.mjs
// Card images are made separately by scripts/keyword-pages/make-cards.sh (macOS).
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SITE = 'https://www.citytourbus.kr';
const DATA_DIR = path.join(ROOT, 'data/keyword-pages');

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const imgPath = (p, key) => `/img/${p.slug}/${p.slug}-${key}.jpg`;

function figure(p, key) {
  const im = p.images[key];
  return `<figure class="kw-figure"><img src="${imgPath(p, key)}" alt="${esc(im.alt)}" width="1080" height="1080" loading="${key === 'main' ? 'eager' : 'lazy'}" decoding="async"><figcaption>${esc(im.alt)}</figcaption></figure>`;
}

const cta = (p, extra = '') => `<a class="button kw-cta${extra}" href="${esc(p.booking.url)}" target="_blank" rel="sponsored nofollow noopener">${esc(p.booking.label)} →</a>`;

function render(p) {
  const url = `${SITE}/${p.slug}`;
  const k = p.keyword;
  const [y, m] = p.updated.split('-');
  const sections = [];
  let n = 0;
  const sec = (id, label, h2, body) => sections.push(`<section id="${id}" class="card"><p class="section-no">${String(++n).padStart(2, '0')} · ${label}</p><h2>${esc(h2)}</h2>${body}</section>`);

  sec('summary', 'SUMMARY', `${k} 한눈에 보기`,
    `<div class="table-scroll"><table class="kw-summary"><tbody>${p.summary.map(([a, b]) => `<tr><th scope="row">${esc(a)}</th><td>${esc(b)}</td></tr>`).join('')}</tbody></table></div>`);

  sec('route', 'ROUTE', `${k} 노선(루트)`,
    figure(p, 'routes') +
    `<p>${esc(k)}는 ${p.routes.map(r => `${esc(r.name.replace(/ \(.*\)/, ''))}(${esc(r.area)})`).join(', ')} ${p.routes.length}개 노선으로 운행합니다. 정류장 위치는 <a href="${esc(p.routeCheck.url)}">${esc(p.routeCheck.label)}</a>에서 지도로 볼 수 있습니다.</p>` +
    p.routes.map(r => `<div class="kw-route" style="--rc:${r.color}"><h3>${esc(k)} ${esc(r.name)} · ${esc(r.area)}</h3><p class="small">${esc(r.en)} · 한 바퀴 ${esc(r.duration)} · ${esc(r.interval)} · ${esc(r.hours)}</p><ol class="kw-stops">${r.stops.map(s => `<li>${esc(s)}</li>`).join('')}</ol><p>${esc(r.tip)}</p></div>`).join(''));

  if (p.night) sec('night', 'NIGHT TOUR', `${k} 나이트 투어 (야경투어)`,
    figure(p, 'night') + `<p>${esc(p.night.text)}</p><ul><li><b>출발</b> ${esc(p.night.time)}</li><li><b>출발 장소</b> ${esc(p.night.start)}</li><li><b>소요 시간</b> ${esc(p.night.duration)}</li><li><b>가격</b> ${esc(p.night.price)}</li></ul>`);

  sec('price', 'PRICE', `${k} 가격과 티켓 종류`,
    figure(p, 'price') +
    `<div class="table-scroll"><table><thead><tr><th>티켓</th><th>유효</th><th>성인 가격</th><th>포함 내용</th><th>추천</th></tr></thead><tbody>${p.tickets.map(t => `<tr><th scope="row">${esc(t.name)}</th><td>${esc(t.validity)}</td><td>${esc(t.price)}</td><td>${t.includes.map(esc).join('<br>')}</td><td>${esc(t.for)}</td></tr>`).join('')}</tbody></table></div><p class="small">${esc(p.priceNote)}</p>${cta(p)}`);

  sec('booking', 'BOOKING', `${k} 예약 방법`,
    figure(p, 'booking') + `<ol class="kw-steps">${p.howToBook.map(s => `<li>${esc(s)}</li>`).join('')}</ol>${cta(p)}`);

  sec('onsite', 'ON-SITE', `${k} 현장구매`,
    figure(p, 'onsite') + `<p>${esc(p.onsite.text)}</p><div class="table-scroll"><table><tbody>${p.onsite.compare.map(([a, b]) => `<tr><th scope="row">${esc(a)}</th><td>${esc(b)}</td></tr>`).join('')}</tbody></table></div>`);

  sec('ride', 'HOW TO RIDE', `${k} 타는법`,
    figure(p, 'ride') + `<ol class="kw-steps">${p.howToRide.map(s => `<li>${esc(s)}</li>`).join('')}</ol>`);

  sec('faq', 'FAQ', `${k} 자주 묻는 질문`,
    p.faq.map(f => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join(''));

  sections.push(`<section class="card related"><p class="section-no">함께 보기</p><h2>다른 도시 시티투어버스</h2><div class="related-links">${p.related.map(([h, t]) => `<a href="${esc(h)}">${esc(t)}</a>`).join('')}</div></section>`);

  const ogImg = `${SITE}/img/${p.slug}/${p.slug}-og.jpg`;
  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Article', '@id': `${url}#article`, headline: p.title, description: p.description,
        inLanguage: 'ko-KR', datePublished: p.updated, dateModified: p.updated, mainEntityOfPage: url,
        image: [ogImg, ...Object.keys(p.images).map(key => `${SITE}${imgPath(p, key)}`)],
        author: { '@type': 'Organization', name: 'CITYTOURBUS', url: `${SITE}/` },
        publisher: { '@type': 'Organization', name: 'CITYTOURBUS', logo: { '@type': 'ImageObject', url: `${SITE}/apple-touch-icon.png` } }
      },
      { '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: '홈', item: `${SITE}/` },
        { '@type': 'ListItem', position: 2, name: k, item: url }
      ] },
      { '@type': 'FAQPage', mainEntity: p.faq.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) }
    ]
  };

  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(p.title)}</title>
<meta name="description" content="${esc(p.description)}">
<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">
<link rel="canonical" href="${url}">
<meta property="og:type" content="article"><meta property="og:locale" content="ko_KR"><meta property="og:site_name" content="CITYTOURBUS">
<meta property="og:title" content="${esc(p.title)}"><meta property="og:description" content="${esc(p.description)}"><meta property="og:url" content="${url}">
<meta property="og:image" content="${ogImg}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="${esc(p.images.main.alt)}">
<meta property="article:published_time" content="${p.updated}T09:00:00+09:00"><meta property="article:modified_time" content="${p.updated}T09:00:00+09:00">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(p.title)}"><meta name="twitter:image" content="${ogImg}">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/city-guide.css"><link rel="stylesheet" href="/keyword-page.css">
<script type="application/ld+json">${JSON.stringify(ld)}</script>
</head><body>
<header class="site-header"><div class="header-inner"><a class="logo" href="/"><span>CITY</span>TOURBUS<small>.KR</small></a><nav aria-label="주요 메뉴"><a href="/">전체 도시</a><a href="/compare">한눈에 비교</a></nav></div></header>
<main><div class="wrap">
<nav class="breadcrumbs" aria-label="이동 경로"><a href="/">홈</a><span>›</span><span>${esc(k)}</span></nav>
<section class="hero kw-hero"><div><p class="eyebrow">${p.flag} ${esc(p.city)} · ${y}년 ${Number(m)}월 업데이트</p><h1>${esc(k)}<br><span>${esc(p.h1Sub)}</span></h1><p class="lead">${esc(p.lead)}</p><div class="hero-actions">${cta(p)}<a class="text-link" href="#price">가격 먼저 보기 ↓</a></div><p class="small kw-verified">공식 정보 확인일 ${esc(p.verified)} · 예약 링크는 제휴 링크이며 이용자 추가 비용은 없습니다.</p></div>${figure(p, 'main')}</section>
<nav class="kw-toc" aria-label="목차">${['summary:한눈에 보기', 'route:노선', p.night ? 'night:나이트 투어' : '', 'price:가격', 'booking:예약 방법', 'onsite:현장구매', 'ride:타는법', 'faq:FAQ'].filter(Boolean).map(s => { const [id, t] = s.split(':'); return `<a href="#${id}">${t}</a>`; }).join('')}</nav>
<div class="grid"><article class="main-content">
${sections.join('\n')}
</article><aside><div class="aside-card"><strong>${esc(k)} 예약</strong><p>${esc(p.tickets[0] ? `24시간권 ${p.tickets[0].price}` : '')} · 날짜를 고르면 최종 가격이 바로 나옵니다.</p>${cta(p)}<a class="aside-link" href="${esc(p.routeCheck.url)}">정류장 지도 보기 →</a></div></aside></div>
</div></main><footer><div class="wrap"><a href="/">CITYTOURBUS.KR</a><p>전 세계 시티투어버스를 비교합니다. 일부 예약 링크를 통해 수수료를 받을 수 있으며 이용자 추가 비용은 없습니다.</p><a href="/terms">이용약관</a> · <a href="/privacy">개인정보처리방침</a></div></footer>
</body></html>
`;
}

// Card image spec for make-cards.sh
function cardSpec(p) {
  const out = [];
  for (const [key, im] of Object.entries(p.images)) {
    out.push({ out: `img/${p.slug}/${p.slug}-${key}.jpg`, w: 1080, h: 1080, ...im });
  }
  const main = p.images.main;
  out.push({ out: `img/${p.slug}/${p.slug}-og.jpg`, w: 1200, h: 630, ...main, title: main.title.replace('\n', ' ') });
  return out;
}

const pages = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json')).map(f => JSON.parse(fs.readFileSync(path.join(DATA_DIR, f), 'utf8')));
const specs = [];
let sitemap = fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8');
for (const p of pages) {
  fs.writeFileSync(path.join(ROOT, `${p.slug}.html`), render(p));
  specs.push(...cardSpec(p));
  const loc = `${SITE}/${p.slug}`;
  const entry = `  <url><loc>${loc}</loc><lastmod>${p.updated}</lastmod><changefreq>weekly</changefreq><priority>0.9</priority></url>`;
  const re = new RegExp(`  <url><loc>${loc.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}</loc>.*?</url>`);
  sitemap = re.test(sitemap) ? sitemap.replace(re, entry) : sitemap.replace('</urlset>', `${entry}\n</urlset>`);
  console.log('built', `${p.slug}.html`);
}
fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), sitemap);
fs.mkdirSync(path.join(ROOT, 'scripts/keyword-pages/.cache'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'scripts/keyword-pages/.cache/cards.json'), JSON.stringify(specs, null, 1));
console.log('card specs:', specs.length);
