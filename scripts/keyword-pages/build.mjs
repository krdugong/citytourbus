// Builds keyword landing pages (e.g. /hong-kong-big-bus) from data/keyword-pages/*.json.
// Usage (from repo root): node scripts/keyword-pages/build.mjs
// Card images are made separately by scripts/keyword-pages/make-cards.sh (macOS).
//
// Page JSON fields (optional ones marked ?):
//   slug, keyword, city, flag, published?, updated, verified, title, description, h1Sub, lead, aka?[],
//   (published = the day the URL first went live, kept fixed; updated = last content change. Article
//   datePublished and the RSS pubDate use published, dateModified and the sitemap lastmod use updated.)
//   booking{url,label}, official, routeCheck?{url,label}, cityGuide?{url,label},
//   summary[[k,v]], routes[{color,name,area?,en,duration,interval,hours,stops?[],tip}],
//   night?{time,start,duration,price,text}, tickets[{name,validity,price,includes[],for}], priceNote,
//   onsite?{text,compare[[k,v]]}, extra?[{id,label,h2,image?,paras?[],table?[[k,v]]}],
//   howToBook?[], howToRide?[] (Big Bus defaults used when operator is "bigbus"),
//   h2?{route,night,price,booking,onsite,ride,faq}, faq[{q,a}], images{key:{alt,eyebrow,title,sub,bg}},
//   asideNote, operator?, affiliate? (false = booking button goes to the operator's own site)
import fs from 'node:fs';
import path from 'node:path';
import { TAG, ICONS, PRECONNECT, fontLinks } from '../head-bits.mjs';
import { alternates, langLinks } from '../i18n/links.mjs';

const ROOT = process.cwd();
const SITE = 'https://www.citytourbus.kr';
const DATA_DIR = path.join(ROOT, 'data/keyword-pages');
const GYG = JSON.parse(fs.readFileSync(path.join(DATA_DIR, '_getyourguide.json'), 'utf8'));
const gygUrl = (p) => {
  const loc = GYG.cities[p.slug.replace(/-(big-bus|city-tour-bus)$/, '')];
  return loc ? `https://www.getyourguide.com/ko-kr/${loc}/?${GYG.partner}` : null;
};

const BIGBUS_DEFAULTS = {
  howToBook: [
    '아래 예약 버튼으로 Big Bus 예약 페이지에 들어갑니다.',
    '티켓 종류와 첫 탑승 날짜, 인원을 고르고 결제합니다.',
    '이메일로 받은 예약번호를 Big Bus Tours 앱의 ‘Add booking’에 입력해 두면 종이 티켓 없이 탈 수 있습니다.'
  ],
  howToRide: [
    'Big Bus Tours 앱(App Store·Google Play)을 설치하고 예약번호로 티켓을 불러옵니다.',
    '승하차 티켓은 탑승 당일 아침에 앱에서 ‘Activate(활성화)’를 누릅니다. 이때부터 24·48시간이 계산되고, 예약한 날짜에만 활성화할 수 있습니다.',
    '가까운 정류장에서 버스가 오면 기사에게 활성화된 티켓을 보여주고 탑승합니다.',
    '원하는 정류장에서 내렸다가 같은 노선의 다음 버스를 다시 타면 됩니다. 앱에서 실시간 버스 도착 시간을 볼 수 있습니다.',
    '나이트 투어처럼 승하차가 없는 상품은 앱에 티켓을 추가한 뒤 출발 정류장에서 기사에게 보여주면 됩니다.'
  ]
};

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const imgPath = (p, key) => `/img/${p.slug}/${p.slug}-${key}.jpg`;

// The two shared stylesheets (~5KB) are inlined into each city page so the first paint needs no extra round trip.
// When that round trip ran late, the first paint got caught behind the web-font download and slipped by 1-2s.
// The files stay as they are for the 404 page and the older guide pages.
const INLINE_CSS = ['city-guide.css', 'keyword-page.css'].map(f => fs.readFileSync(path.join(ROOT, f), 'utf8').trim()).join('\n');

function figure(p, key) {
  const im = p.images[key];
  if (!im) return '';
  // the hero card is the largest thing above the fold, so it is fetched first; everything else waits until scrolled to
  return `<figure class="kw-figure"><img src="${imgPath(p, key)}" alt="${esc(im.alt)}" width="1080" height="1080" ${key === 'main' ? 'loading="eager" fetchpriority="high"' : 'loading="lazy"'} decoding="async"><figcaption>${esc(im.alt)}</figcaption></figure>`;
}

// Route-map images made by scripts/route-maps (overview + one per route, in data/route-maps order)
function routeMap(p) {
  const out = { overview: null, perRoute: [] };
  const overview = `img/${p.slug}/${p.slug}-map.jpg`;
  if (fs.existsSync(path.join(ROOT, overview))) out.overview = `/${overview}`;
  const dataFile = path.join(ROOT, 'data/route-maps', `${p.slug}.json`);
  if (fs.existsSync(dataFile)) {
    for (const r of JSON.parse(fs.readFileSync(dataFile, 'utf8')).routes) {
      const f = `img/${p.slug}/${p.slug}-map-${r.key}.jpg`;
      out.perRoute.push(fs.existsSync(path.join(ROOT, f)) ? { src: `/${f}`, title: r.title || r.name } : null);
    }
  }
  return out;
}
const mapFigure = (src, alt) => `<figure class="kw-figure kw-map"><img src="${src}" alt="${esc(alt)}" width="1080" height="1080" loading="lazy" decoding="async"><figcaption>${esc(alt)} · 정류장 순서 기준 참고용 · © OpenStreetMap contributors</figcaption></figure>`;
const cta = (p) => `<a class="button kw-cta" href="${esc(p.booking.url)}" target="_blank" rel="${p.affiliate === false ? 'nofollow noopener' : 'sponsored nofollow noopener'}">${esc(p.booking.label)} →</a>`;
const kvTable = (rows, cls = '') => `<div class="table-scroll"><table${cls ? ` class="${cls}"` : ''}><tbody>${rows.map(([a, b]) => `<tr><th scope="row">${esc(a)}</th><td>${esc(b)}</td></tr>`).join('')}</tbody></table></div>`;

function render(p, all) {
  const url = `${SITE}/${p.slug}`;
  const k = p.keyword;
  const published = p.published || p.updated;
  const h2 = { route: `${k} 노선(루트)`, night: `${k} 나이트 투어 (야경투어)`, price: `${k} 가격과 티켓 종류`, booking: `${k} 예약 방법`, onsite: `${k} 현장구매`, ride: `${k} 타는법`, faq: `${k} 자주 묻는 질문`, ...(p.h2 || {}) };
  const defaults = p.operator === 'bigbus' ? BIGBUS_DEFAULTS : {};
  const howToBook = p.howToBook || defaults.howToBook;
  const howToRide = p.howToRide || defaults.howToRide;
  const [y, m] = p.updated.split('-');
  const sections = [];
  const toc = [];
  let n = 0;
  const sec = (id, label, title, tocLabel, body) => {
    sections.push(`<section id="${id}" class="card"><p class="section-no">${String(++n).padStart(2, '0')} · ${label}</p><h2>${esc(title)}</h2>${body}</section>`);
    if (tocLabel) toc.push(`<a href="#${id}">${esc(tocLabel)}</a>`);
  };

  // Other spellings people search with (Naver autocomplete), shown as a plain "also known as" row
  const aka = p.aka || (/빅버스$/.test(k)
    ? [`${p.city} 빅버스 투어`, `${p.city} 시티투어버스`, `${p.city} 시티투어 버스`, `${p.city} 2층버스 투어`, `${p.city} 홉온홉오프 버스`]
    : [`${p.city} 시티투어 버스`, `${p.city} 버스투어`, `${p.city} 2층버스 투어`, `${p.city} 홉온홉오프 버스`]);
  sec('summary', 'SUMMARY', `${k} 한눈에 보기`, '한눈에 보기', kvTable([['다른 이름', aka.join(', ')], ...p.summary], 'kw-summary'));

  const routeNames = p.routes.map(r => `${r.name.replace(/ \(.*\)/, '')}${r.area ? `(${r.area})` : ''}`).join(', ');
  const map = routeMap(p);
  sec('route', 'ROUTE', h2.route, '노선',
    (map.overview ? mapFigure(map.overview, `${k} 노선도`) : figure(p, 'routes')) +
    `<p>${esc(k)}는 ${esc(routeNames)} ${p.routes.length > 1 ? `${p.routes.length}개 노선으로` : '노선 하나로'} 운행합니다.${p.routeCheck ? ` 정류장 위치는 <a href="${esc(p.routeCheck.url)}">${esc(p.routeCheck.label)}</a>에서 지도로 볼 수 있습니다.` : ''}</p>` +
    p.routes.map((r, i) => `<div class="kw-route" style="--rc:${r.color}"><h3>${esc(k)} ${esc(r.name)}${r.area ? ` · ${esc(r.area)}` : ''}</h3><p class="small">${esc(r.en)} · ${esc(r.duration)} · ${esc(r.interval)} · ${esc(r.hours)}</p>${r.stops && r.stops.length ? `<ol class="kw-stops">${r.stops.map(s => `<li>${esc(s)}</li>`).join('')}</ol>` : ''}<p>${esc(r.tip)}</p>${map.perRoute[i] ? mapFigure(map.perRoute[i].src, `${k} ${map.perRoute[i].title} 노선도`) : ''}</div>`).join(''));

  if (p.night) sec('night', 'NIGHT TOUR', h2.night, '나이트 투어',
    figure(p, 'night') + `<p>${esc(p.night.text)}</p><ul><li><b>출발</b> ${esc(p.night.time)}</li><li><b>출발 장소</b> ${esc(p.night.start)}</li><li><b>소요 시간</b> ${esc(p.night.duration)}</li><li><b>가격</b> ${esc(p.night.price)}</li></ul>`);

  sec('price', 'PRICE', h2.price, '가격',
    figure(p, 'price') +
    `<div class="table-scroll"><table><thead><tr><th>티켓</th><th>유효</th><th>성인 가격</th><th>포함 내용</th><th>추천</th></tr></thead><tbody>${p.tickets.map(t => `<tr><th scope="row">${esc(t.name)}</th><td>${esc(t.validity)}</td><td>${esc(t.price)}</td><td>${t.includes.map(esc).join('<br>')}</td><td>${esc(t.for)}</td></tr>`).join('')}</tbody></table></div><p class="small">${esc(p.priceNote)}</p>${cta(p)}`);

  for (const x of p.extra || []) {
    sec(x.id, x.label, x.h2, x.toc || null,
      (x.image ? figure(p, x.image) : '') + (x.paras || []).map(t => `<p>${esc(t)}</p>`).join('') + (x.table ? kvTable(x.table) : ''));
  }

  sec('booking', 'BOOKING', h2.booking, '예약 방법',
    figure(p, 'booking') + `<ol class="kw-steps">${howToBook.map(s => `<li>${esc(s)}</li>`).join('')}</ol>${cta(p)}`);

  if (p.onsite) sec('onsite', 'ON-SITE', h2.onsite, '현장구매',
    figure(p, 'onsite') + `<p>${esc(p.onsite.text)}</p>${kvTable(p.onsite.compare)}`);

  sec('ride', 'HOW TO RIDE', h2.ride, '타는법',
    figure(p, 'ride') + `<ol class="kw-steps">${howToRide.map(s => `<li>${esc(s)}</li>`).join('')}</ol>`);

  sec('faq', 'FAQ', h2.faq, 'FAQ', p.faq.map(f => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join(''));

  const gyg = gygUrl(p);
  if (gyg) sections.push(`<section class="card kw-more"><p class="section-no">MORE TOURS</p><h2>${esc(p.city)} 투어·입장권 더 보기</h2><p>${esc(p.city)}에서 시티투어버스 말고도 투어, 입장권, 근교 당일치기 같은 다른 상품을 찾아볼 수 있습니다.</p><a class="button kw-cta" href="${esc(gyg)}" target="_blank" rel="sponsored nofollow noopener">더 많은 투어 알아보기 →</a><p class="small">GetYourGuide 제휴 링크이며 이용자 추가 비용은 없습니다.</p></section>`);

  const related = [
    ...(p.cityGuide ? [[p.cityGuide.url, p.cityGuide.label]] : []),
    ...(p.routeCheck ? [[p.routeCheck.url, p.routeCheck.label.replace(/로 정류장 찾기$/, '')]] : []),
    ...all.filter(o => o.slug !== p.slug).map(o => [`/${o.slug}`, o.keyword])
  ];
  sections.push(`<section class="card related"><p class="section-no">함께 보기</p><h2>다른 도시 빅버스·시티투어버스</h2><div class="related-links">${related.map(([h, t]) => `<a href="${esc(h)}">${esc(t)}</a>`).join('')}</div></section>`);

  const ogImg = `${SITE}/img/${p.slug}/${p.slug}-og.jpg`;
  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Article', '@id': `${url}#article`, headline: p.title, description: p.description,
        inLanguage: 'ko-KR', datePublished: published, dateModified: p.updated, mainEntityOfPage: url,
        image: [ogImg, ...Object.keys(p.images).map(key => `${SITE}${imgPath(p, key)}`), ...[map.overview, ...map.perRoute.map(x => x && x.src)].filter(Boolean).map(src => `${SITE}${src}`)],
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
${TAG}
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(p.title)}</title>
<meta name="description" content="${esc(p.description)}">
<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">
<link rel="canonical" href="${url}">${alternates(p.slug)}
<meta property="og:type" content="article"><meta property="og:locale" content="ko_KR"><meta property="og:site_name" content="CITYTOURBUS">
<meta property="og:title" content="${esc(p.title)}"><meta property="og:description" content="${esc(p.description)}"><meta property="og:url" content="${url}">
<meta property="og:image" content="${ogImg}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="${esc(p.images.main.alt)}">
<meta property="article:published_time" content="${published}T09:00:00+09:00"><meta property="article:modified_time" content="${p.updated}T09:00:00+09:00">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(p.title)}"><meta name="twitter:image" content="${ogImg}">
${ICONS}
${PRECONNECT}${fontLinks()}
<style>${INLINE_CSS}</style>
<script type="application/ld+json">${JSON.stringify(ld)}</script>
</head><body>
<header class="site-header"><div class="header-inner"><a class="logo" href="/"><span>CITY</span>TOURBUS<small>.KR</small></a><nav aria-label="주요 메뉴"><a href="/">전체 도시</a><a href="/compare">한눈에 비교</a>${langLinks(p.slug, 'ko')}</nav></div></header>
<main><div class="wrap">
<nav class="breadcrumbs" aria-label="이동 경로"><a href="/">홈</a><span>›</span><span>${esc(k)}</span></nav>
<section class="hero kw-hero"><div><p class="eyebrow">${p.flag} ${esc(p.city)} · ${y}년 ${Number(m)}월 업데이트</p><h1>${esc(k)}<br><span>${esc(p.h1Sub)}</span></h1><p class="lead">${esc(p.lead)}</p><div class="hero-actions">${cta(p)}<a class="text-link" href="#price">가격 먼저 보기 ↓</a></div><p class="small kw-verified">공식 정보 확인일 ${esc(p.verified)} · ${p.affiliate === false ? '예약 버튼은 운영사 공식 사이트로 연결되고, 아래 GetYourGuide 링크는 제휴 링크입니다.' : '예약 링크는 제휴 링크이며 이용자 추가 비용은 없습니다.'}</p></div>${figure(p, 'main')}</section>
<nav class="kw-toc" aria-label="목차">${toc.join('')}</nav>
<div class="grid"><article class="main-content">
${sections.join('\n')}
</article><aside><div class="aside-card"><strong>${esc(k)} 예약</strong><p>${esc(p.asideNote)}</p>${cta(p)}${p.routeCheck ? `<a class="aside-link" href="${esc(p.routeCheck.url)}">정류장 지도 보기 →</a>` : `<a class="aside-link" href="#route">노선·정류장 보기 →</a>`}</div></aside></div>
</div></main><footer><div class="wrap"><a href="/">CITYTOURBUS.KR</a><p>전 세계 시티투어버스를 비교합니다. 일부 예약 링크를 통해 수수료를 받을 수 있으며 이용자 추가 비용은 없습니다.</p><a href="/terms">이용약관</a> · <a href="/privacy">개인정보처리방침</a></div></footer>
<div class="kw-sticky" id="kw-sticky" hidden><div class="kw-sticky-txt"><b>${esc(k)}</b><small>${esc(p.tickets[0].price)}</small></div><a class="button kw-cta" href="${esc(p.booking.url)}" target="_blank" rel="${p.affiliate === false ? 'nofollow noopener' : 'sponsored nofollow noopener'}">예약하기 →</a></div>
<script>(function(){var s=document.getElementById('kw-sticky'),h=document.querySelector('.hero-actions');if(!s||!h||!('IntersectionObserver' in window))return;new IntersectionObserver(function(e){var r=e[0],show=!r.isIntersecting&&r.boundingClientRect.top<0;s.hidden=!show;document.body.classList.toggle('has-sticky',show)}).observe(h)})();</script>
</body></html>
`;
}

function cardSpec(p) {
  const out = Object.entries(p.images).map(([key, im]) => ({ out: `img/${p.slug}/${p.slug}-${key}.jpg`, w: 1080, h: 1080, ...im }));
  const main = p.images.main;
  out.push({ out: `img/${p.slug}/${p.slug}-og.jpg`, w: 1200, h: 630, ...main, title: main.title.replace('\n', ' ') });
  return out;
}

// Replace (or insert) a marked block in a file. Returns true when the file changed.
function setBlock(file, name, html, insertBefore) {
  const fp = path.join(ROOT, file);
  if (!fs.existsSync(fp)) return false;
  const s = fs.readFileSync(fp, 'utf8');
  const start = `<!-- ${name}:start -->`, end = `<!-- ${name}:end -->`;
  const block = `${start}${html}${end}`;
  let out;
  if (s.includes(start)) out = s.replace(new RegExp(`${start}[\\s\\S]*?${end}`), block);
  else if (insertBefore && s.includes(insertBefore)) out = s.replace(insertBefore, block + insertBefore);
  else return false;
  if (out !== s) { fs.writeFileSync(fp, out); return true; }
  return false;
}

const pages = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json') && !f.startsWith('_')).sort()
  .map(f => JSON.parse(fs.readFileSync(path.join(DATA_DIR, f), 'utf8')));
const specs = [];
let sitemap = fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8');
for (const p of pages) {
  fs.writeFileSync(path.join(ROOT, `${p.slug}.html`), render(p, pages));
  specs.push(...cardSpec(p));
  const loc = `${SITE}/${p.slug}`;
  const entry = `  <url><loc>${loc}</loc><lastmod>${p.updated}</lastmod><changefreq>weekly</changefreq><priority>0.9</priority></url>`;
  const re = new RegExp(`  <url><loc>${loc.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}</loc>.*?</url>`);
  sitemap = re.test(sitemap) ? sitemap.replace(re, entry) : sitemap.replace('</urlset>', `${entry}\n</urlset>`);
  // link from the matching city guide page back to this keyword page
  if (p.cityGuide) {
    const f = `${p.cityGuide.url.replace(/^\//, '')}.html`;
    setBlock(f, 'kw-link', `<p class="kw-backlink"><a href="/${p.slug}">${esc(p.keyword)} 노선·가격·예약 총정리 →</a></p>`, '<div class="hero-actions">');
  }
  console.log('built', `${p.slug}.html`);
}
fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), sitemap);

// rss.xml (submitted to Naver Search Advisor): every keyword page plus the ticket guide, newest first.
// pubDate is the first-publish date so an edit never makes an old page look like a new post; the channel's
// lastBuildDate is the latest content change so the feed itself still reads as updated.
const rssItems = [
  ...pages.map(p => ({ title: p.title, link: `${SITE}/${p.slug}`, description: p.description, date: p.published || p.updated })),
  { title: '시티투어버스 티켓을 비교하는 방법', link: `${SITE}/guide/compare-tickets`, description: '이용시간, 노선, 정류장, 취소 조건을 기준으로 시티투어버스 티켓을 비교하는 방법을 설명합니다.', date: '2026-10-27' }
].sort((a, b) => b.date.localeCompare(a.date) || a.link.localeCompare(b.link));
const rssDate = (d) => new Date(`${d}T09:00:00+09:00`).toUTCString();
fs.writeFileSync(path.join(ROOT, 'rss.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
<title>CITYTOURBUS 도시별 시티투어버스 가이드</title>
<link>${SITE}/</link>
<description>전 세계 도시별 시티투어버스·빅버스 노선, 가격, 예약 방법, 타는법 정리</description>
<language>ko</language>
<lastBuildDate>${rssDate(pages.map(p => p.updated).sort().pop())}</lastBuildDate>
${rssItems.map(i => `<item><title>${esc(i.title)}</title><link>${i.link}</link><guid isPermaLink="true">${i.link}</guid><description>${esc(i.description)}</description><pubDate>${rssDate(i.date)}</pubDate></item>`).join('\n')}
</channel></rss>
`);

// homepage: list every keyword page (index.html is what "/" serves; keep index-v2.html in sync)
const homeLinks = pages.map(p => `<a href="/${p.slug}" style="display:block;background:#fff;border:1px solid #e5e5ea;border-radius:12px;padding:16px;text-decoration:none;font-size:14px;font-weight:700">${esc(p.keyword)} <span style="float:right;color:#e22b37">→</span></a>`).join('');
const homeBlock = `<div style="max-width:1180px;margin:28px auto 0"><h2 style="font-size:22px;letter-spacing:-.6px;margin:0 0 14px">도시별 시티투어버스 노선·가격 총정리</h2><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:10px">${homeLinks}</div></div>`;
for (const f of ['index.html', 'index-v2.html']) setBlock(f, 'kw-home', homeBlock, '</section><footer>');

fs.mkdirSync(path.join(ROOT, 'scripts/keyword-pages/.cache'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'scripts/keyword-pages/.cache/cards.json'), JSON.stringify(specs, null, 1));
console.log('pages:', pages.length, 'card specs:', specs.length);
