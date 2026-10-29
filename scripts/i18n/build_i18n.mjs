// Builds the English (/en/...) and Japanese (/ja/...) city pages from data/i18n/<lang>/<slug>.json.
// Each translation file holds the translated text of a Korean keyword page (data/keyword-pages/<slug>.json);
// anything it leaves out (dates, flag, colours, affiliate flag, booking URL) comes from the Korean page.
// Also writes /en/index.html and /ja/index.html, the localized hero/og card specs, and the sitemap entries.
// Usage (from repo root, after scripts/keyword-pages/build.mjs): node scripts/i18n/build_i18n.mjs
import fs from 'node:fs';
import path from 'node:path';
import { TAG, ICONS, PRECONNECT, fontLinks } from '../head-bits.mjs';
import { alternates, langLinks } from './links.mjs';

const ROOT = process.cwd();
const SITE = 'https://www.citytourbus.kr';
const KO_DIR = path.join(ROOT, 'data/keyword-pages');
const GYG = JSON.parse(fs.readFileSync(path.join(KO_DIR, '_getyourguide.json'), 'utf8'));
const INLINE_CSS = ['city-guide.css', 'keyword-page.css'].map(f => fs.readFileSync(path.join(ROOT, f), 'utf8').trim()).join('\n');
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const LANGS = {
  en: {
    html: 'en', og: 'en_US', inLang: 'en-US', gyg: '', home: 'All cities', homeTitle: 'City Tour Bus Guides: Routes, Prices and How to Ride | CITYTOURBUS',
    homeDesc: 'Plain-English guides to city tour buses in Korea and around the world: routes, stops, ticket prices, night tours and how to ride, checked against the operators\' own sites.',
    homeH1: 'City tour bus guides', homeLead: 'Routes, stops, prices and how to ride, checked against each operator\'s official site.',
    crumbs: 'Breadcrumb', menu: 'Main menu', toc: 'Contents', glance: 'At a glance', aka: 'Also called', route: 'Route and stops', night: 'Night tour',
    price: 'Prices and tickets', booking: 'How to book', ride: 'How to ride', faq: 'FAQ', priceFirst: 'See prices first ↓',
    th: ['Ticket', 'Valid', 'Adult price', 'Includes', 'Best for'], nightLbl: ['Departs', 'From', 'Duration', 'Price'],
    eyebrow: (p) => `${p.flag} ${p.city} · Updated ${MONTHS[Number(p.updated.slice(5, 7)) - 1]} ${p.updated.slice(0, 4)}`,
    verified: (p) => `Official info checked ${p.verified} · ${p.affiliate === false ? 'The booking button goes to the operator\'s official site; the GetYourGuide link below is an affiliate link.' : 'Booking links are affiliate links at no extra cost to you.'}`,
    routeIntro: (p) => `The ${p.keyword} runs ${p.routes.length > 1 ? `${p.routes.length} routes` : 'one route'}: ${p.routes.map(r => r.name).join(', ')}.`,
    more: (p) => `More tours and tickets in ${p.city}`, moreText: (p) => `Besides the city tour bus, you can compare day trips, guided tours and attraction tickets in ${p.city} on GetYourGuide.`,
    moreBtn: 'Browse more tours →', moreNote: 'GetYourGuide affiliate link, no extra cost to you.', related: 'Other city guides', relatedNo: 'MORE GUIDES',
    asideBook: (p) => `${p.keyword}`, asideRoute: 'See route and stops →', book: 'Book →',
    footer: 'Independent guides to city tour buses. Some booking links earn us a commission at no extra cost to you.', langName: 'English', korean: '한국어',
  },
  ja: {
    html: 'ja', og: 'ja_JP', inLang: 'ja-JP', gyg: 'ja-jp/', home: 'すべての都市', homeTitle: 'シティツアーバス ガイド｜ルート・料金・乗り方 | CITYTOURBUS',
    homeDesc: '韓国と世界のシティツアーバスのルート、停留所、料金、夜景ツアー、乗り方を、運営会社の公式情報をもとに日本語でまとめています。',
    homeH1: 'シティツアーバス ガイド', homeLead: 'ルート・停留所・料金・乗り方を、各運営会社の公式サイトで確認してまとめています。',
    crumbs: 'パンくずリスト', menu: 'メインメニュー', toc: '目次', glance: '概要', aka: '別の呼び方', route: 'ルート・停留所', night: '夜景ツアー',
    price: '料金・チケット', booking: '予約方法', ride: '乗り方', faq: 'よくある質問', priceFirst: '料金を先に見る ↓',
    th: ['チケット', '有効期間', '大人料金', '含まれるもの', 'おすすめ'], nightLbl: ['出発', '出発場所', '所要時間', '料金'],
    eyebrow: (p) => `${p.flag} ${p.city} · ${p.updated.slice(0, 4)}年${Number(p.updated.slice(5, 7))}月更新`,
    verified: (p) => `公式情報確認日 ${p.verified} · ${p.affiliate === false ? '予約ボタンは運営会社の公式サイトにつながります。下のGetYourGuideリンクはアフィリエイトリンクです。' : '予約リンクはアフィリエイトリンクで、追加料金はかかりません。'}`,
    routeIntro: (p) => `${p.keyword}は${p.routes.map(r => r.name).join('、')}の${p.routes.length > 1 ? `${p.routes.length}つのルート` : '1ルート'}で運行しています。`,
    more: (p) => `${p.city}のツアー・チケットをもっと見る`, moreText: (p) => `シティツアーバス以外にも、${p.city}発の日帰りツアーやガイドツアー、観光施設のチケットをGetYourGuideで比べられます。`,
    moreBtn: 'ほかのツアーを見る →', moreNote: 'GetYourGuideのアフィリエイトリンクです。追加料金はかかりません。', related: 'ほかの都市のガイド', relatedNo: 'MORE GUIDES',
    asideBook: (p) => `${p.keyword}`, asideRoute: 'ルート・停留所を見る →', book: '予約する →',
    footer: 'シティツアーバスを比較する独立ガイドです。一部の予約リンクから手数料を受け取ることがありますが、追加料金はかかりません。', langName: '日本語', korean: '한국어',
  },
};

const koPage = (slug) => JSON.parse(fs.readFileSync(path.join(KO_DIR, `${slug}.json`), 'utf8'));
const translations = (lang) => {
  const dir = path.join(ROOT, 'data/i18n', lang);
  return fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => f.endsWith('.json')).sort().map(f => f.replace(/\.json$/, '')) : [];
};

function merge(lang, slug) {
  const ko = koPage(slug);
  const t = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/i18n', lang, `${slug}.json`), 'utf8'));
  const p = { ...t, slug, flag: ko.flag, published: t.published || ko.published, updated: t.updated || ko.updated, verified: t.verified || ko.verified, affiliate: ko.affiliate };
  p.booking = { url: (t.booking && t.booking.url) || ko.booking.url, label: t.booking.label };
  p.routes = t.routes.map((r, i) => ({ color: (ko.routes[i] || {}).color || '#e2252b', ...r }));
  return p;
}

const imgBase = (lang, slug) => `/img/${lang}/${slug}`;
function render(lang, p, all) {
  const L = LANGS[lang];
  const url = `${SITE}/${lang}/${p.slug}`;
  const k = p.keyword;
  const cta = `<a class="button kw-cta" href="${esc(p.booking.url)}" target="_blank" rel="${p.affiliate === false ? 'nofollow noopener' : 'sponsored nofollow noopener'}">${esc(p.booking.label)} →</a>`;
  const kv = (rows, cls = '') => `<div class="table-scroll"><table${cls ? ` class="${cls}"` : ''}><tbody>${rows.map(([a, b]) => `<tr><th scope="row">${esc(a)}</th><td>${esc(b)}</td></tr>`).join('')}</tbody></table></div>`;
  const sections = [], toc = [];
  let n = 0;
  const sec = (id, label, title, tocLabel, body) => {
    sections.push(`<section id="${id}" class="card"><p class="section-no">${String(++n).padStart(2, '0')} · ${label}</p><h2>${esc(title)}</h2>${body}</section>`);
    if (tocLabel) toc.push(`<a href="#${id}">${esc(tocLabel)}</a>`);
  };
  sec('summary', 'SUMMARY', `${k}: ${L.glance}`, L.glance, kv([...(p.aka ? [[L.aka, p.aka.join(', ')]] : []), ...p.summary], 'kw-summary'));
  sec('route', 'ROUTE', `${k}: ${L.route}`, L.route, `<p>${esc(L.routeIntro(p))}</p>` +
    p.routes.map(r => `<div class="kw-route" style="--rc:${r.color}"><h3>${esc(r.name)}${r.area ? ` · ${esc(r.area)}` : ''}</h3><p class="small">${[r.duration, r.interval, r.hours].filter(Boolean).map(esc).join(' · ')}</p>${r.stops && r.stops.length ? `<ol class="kw-stops">${r.stops.map(s => `<li>${esc(s)}</li>`).join('')}</ol>` : ''}<p>${esc(r.tip)}</p></div>`).join(''));
  if (p.night) sec('night', 'NIGHT TOUR', `${k}: ${L.night}`, L.night,
    `<p>${esc(p.night.text)}</p><ul>${[p.night.time, p.night.start, p.night.duration, p.night.price].map((v, i) => `<li><b>${L.nightLbl[i]}</b> ${esc(v)}</li>`).join('')}</ul>`);
  sec('price', 'PRICE', `${k}: ${L.price}`, L.price,
    `<div class="table-scroll"><table><thead><tr>${L.th.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${p.tickets.map(t => `<tr><th scope="row">${esc(t.name)}</th><td>${esc(t.validity)}</td><td>${esc(t.price)}</td><td>${t.includes.map(esc).join('<br>')}</td><td>${esc(t.for)}</td></tr>`).join('')}</tbody></table></div><p class="small">${esc(p.priceNote)}</p>${cta}`);
  sec('booking', 'BOOKING', `${k}: ${L.booking}`, L.booking, `<ol class="kw-steps">${p.howToBook.map(s => `<li>${esc(s)}</li>`).join('')}</ol>${cta}`);
  sec('ride', 'HOW TO RIDE', `${k}: ${L.ride}`, L.ride, `<ol class="kw-steps">${p.howToRide.map(s => `<li>${esc(s)}</li>`).join('')}</ol>`);
  sec('faq', 'FAQ', `${k}: ${L.faq}`, L.faq, p.faq.map(f => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join(''));
  const loc = GYG.cities[p.slug.replace(/-(big-bus|city-tour-bus)$/, '')];
  if (loc) sections.push(`<section class="card kw-more"><p class="section-no">MORE TOURS</p><h2>${esc(L.more(p))}</h2><p>${esc(L.moreText(p))}</p><a class="button kw-cta" href="https://www.getyourguide.com/${L.gyg}${loc}/?${esc(GYG.partner)}" target="_blank" rel="sponsored nofollow noopener">${L.moreBtn}</a><p class="small">${L.moreNote}</p></section>`);
  const others = all.filter(o => o.slug !== p.slug);
  if (others.length) sections.push(`<section class="card related"><p class="section-no">${L.relatedNo}</p><h2>${L.related}</h2><div class="related-links">${others.map(o => `<a href="/${lang}/${o.slug}">${esc(o.keyword)}</a>`).join('')}</div></section>`);

  const og = `${SITE}${imgBase(lang, p.slug)}-og.jpg`;
  const ld = { '@context': 'https://schema.org', '@graph': [
    { '@type': 'Article', '@id': `${url}#article`, headline: p.title, description: p.description, inLanguage: L.inLang, datePublished: p.published, dateModified: p.updated,
      mainEntityOfPage: url, image: [og, `${SITE}${imgBase(lang, p.slug)}-main.jpg`], author: { '@type': 'Organization', name: 'CITYTOURBUS', url: `${SITE}/` },
      publisher: { '@type': 'Organization', name: 'CITYTOURBUS', logo: { '@type': 'ImageObject', url: `${SITE}/apple-touch-icon.png` } } },
    { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: L.home, item: `${SITE}/${lang}` }, { '@type': 'ListItem', position: 2, name: k, item: url }] },
    { '@type': 'FAQPage', mainEntity: p.faq.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) }
  ] };
  return `<!doctype html>
<html lang="${L.html}">
<head>
${TAG}
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(p.title)}</title>
<meta name="description" content="${esc(p.description)}">
<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">
<link rel="canonical" href="${url}">
${alternates(p.slug)}
<meta property="og:type" content="article"><meta property="og:locale" content="${L.og}"><meta property="og:site_name" content="CITYTOURBUS">
<meta property="og:title" content="${esc(p.title)}"><meta property="og:description" content="${esc(p.description)}"><meta property="og:url" content="${url}">
<meta property="og:image" content="${og}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta property="article:published_time" content="${p.published}T09:00:00+09:00"><meta property="article:modified_time" content="${p.updated}T09:00:00+09:00">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(p.title)}"><meta name="twitter:image" content="${og}">
${ICONS}
${PRECONNECT}${fontLinks()}
<style>${INLINE_CSS}</style>
<script type="application/ld+json">${JSON.stringify(ld)}</script>
</head><body>
<header class="site-header"><div class="header-inner"><a class="logo" href="/${lang}"><span>CITY</span>TOURBUS<small>.KR</small></a><nav aria-label="${L.menu}"><a href="/${lang}">${L.home}</a>${langLinks(p.slug, lang)}</nav></div></header>
<main><div class="wrap">
<nav class="breadcrumbs" aria-label="${L.crumbs}"><a href="/${lang}">${L.home}</a><span>›</span><span>${esc(k)}</span></nav>
<section class="hero kw-hero"><div><p class="eyebrow">${esc(L.eyebrow(p))}</p><h1>${esc(k)}<br><span>${esc(p.h1Sub)}</span></h1><p class="lead">${esc(p.lead)}</p><div class="hero-actions">${cta}<a class="text-link" href="#price">${L.priceFirst}</a></div><p class="small kw-verified">${esc(L.verified(p))}</p></div><figure class="kw-figure"><img src="${imgBase(lang, p.slug)}-main.jpg" alt="${esc(p.images.main.alt)}" width="1080" height="1080" loading="eager" fetchpriority="high" decoding="async"><figcaption>${esc(p.images.main.alt)}</figcaption></figure></section>
<nav class="kw-toc" aria-label="${L.toc}">${toc.join('')}</nav>
<div class="grid"><article class="main-content">
${sections.join('\n')}
</article><aside><div class="aside-card"><strong>${esc(L.asideBook(p))}</strong><p>${esc(p.asideNote)}</p>${cta}<a class="aside-link" href="#route">${L.asideRoute}</a></div></aside></div>
</div></main><footer><div class="wrap"><a href="/${lang}">CITYTOURBUS</a><p>${L.footer}</p><a href="/" hreflang="ko" lang="ko">한국어</a></div></footer>
<div class="kw-sticky" id="kw-sticky" hidden><div class="kw-sticky-txt"><b>${esc(k)}</b><small>${esc(p.tickets[0].price)}</small></div><a class="button kw-cta" href="${esc(p.booking.url)}" target="_blank" rel="${p.affiliate === false ? 'nofollow noopener' : 'sponsored nofollow noopener'}">${L.book}</a></div>
<script>(function(){var s=document.getElementById('kw-sticky'),h=document.querySelector('.hero-actions');if(!s||!h||!('IntersectionObserver' in window))return;new IntersectionObserver(function(e){var r=e[0],show=!r.isIntersecting&&r.boundingClientRect.top<0;s.hidden=!show;document.body.classList.toggle('has-sticky',show)}).observe(h)})();</script>
</body></html>
`;
}

function renderHome(lang, pages) {
  const L = LANGS[lang];
  const url = `${SITE}/${lang}`;
  const other = Object.keys(LANGS).filter(l => l !== lang);
  const ld = { '@context': 'https://schema.org', '@type': 'ItemList', name: L.homeH1, itemListElement: pages.map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: `${SITE}/${lang}/${p.slug}` })) };
  return `<!doctype html>
<html lang="${L.html}">
<head>
${TAG}
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(L.homeTitle)}</title>
<meta name="description" content="${esc(L.homeDesc)}">
<link rel="canonical" href="${url}">
<link rel="alternate" hreflang="ko" href="${SITE}/">${Object.keys(LANGS).map(l => `<link rel="alternate" hreflang="${l}" href="${SITE}/${l}">`).join('')}<link rel="alternate" hreflang="x-default" href="${SITE}/en">
<meta property="og:type" content="website"><meta property="og:locale" content="${L.og}"><meta property="og:site_name" content="CITYTOURBUS"><meta property="og:title" content="${esc(L.homeTitle)}"><meta property="og:description" content="${esc(L.homeDesc)}"><meta property="og:url" content="${url}">
${ICONS}
${PRECONNECT}${fontLinks()}
<style>${INLINE_CSS}</style>
<script type="application/ld+json">${JSON.stringify(ld)}</script>
</head><body>
<header class="site-header"><div class="header-inner"><a class="logo" href="/${lang}"><span>CITY</span>TOURBUS<small>.KR</small></a><nav aria-label="${L.menu}"><a href="/" hreflang="ko" lang="ko">한국어</a>${other.map(l => `<a href="/${l}" hreflang="${l}" lang="${l}">${LANGS[l].langName}</a>`).join('')}</nav></div></header>
<main><div class="wrap">
<section class="hero kw-hero"><div><h1>${esc(L.homeH1)}</h1><p class="lead">${esc(L.homeLead)}</p></div></section>
<section class="card related"><div class="related-links">${pages.map(p => `<a href="/${lang}/${p.slug}">${p.flag} ${esc(p.keyword)}</a>`).join('')}</div></section>
</div></main><footer><div class="wrap"><a href="/${lang}">CITYTOURBUS</a><p>${L.footer}</p></div></footer>
</body></html>
`;
}

// ------------------------------------------------------------------ build
const specs = [];
let sitemap = fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8');
const setUrl = (loc, lastmod) => {
  const entry = `  <url><loc>${loc}</loc><lastmod>${lastmod}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>`;
  const re = new RegExp(`  <url><loc>${loc.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}</loc>.*?</url>`);
  sitemap = re.test(sitemap) ? sitemap.replace(re, entry) : sitemap.replace('</urlset>', `${entry}\n</urlset>`);
};
let built = 0;
for (const lang of Object.keys(LANGS)) {
  const slugs = translations(lang);
  if (!slugs.length) continue;
  const pages = slugs.map(s => merge(lang, s));
  fs.mkdirSync(path.join(ROOT, lang), { recursive: true });
  for (const p of pages) {
    fs.writeFileSync(path.join(ROOT, lang, `${p.slug}.html`), render(lang, p, pages));
    const im = p.images.main;
    specs.push({ out: `img/${lang}/${p.slug}-main.jpg`, w: 1080, h: 1080, ...im });
    specs.push({ out: `img/${lang}/${p.slug}-og.jpg`, w: 1200, h: 630, ...im, title: im.title.replace('\n', ' ') });
    setUrl(`${SITE}/${lang}/${p.slug}`, p.updated);
    built++;
  }
  fs.writeFileSync(path.join(ROOT, lang, 'index.html'), renderHome(lang, pages));
  setUrl(`${SITE}/${lang}`, pages.map(p => p.updated).sort().pop());
}
fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), sitemap);
fs.mkdirSync(path.join(ROOT, 'scripts/i18n/.cache'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'scripts/i18n/.cache/cards.json'), JSON.stringify(specs, null, 1));
console.log('i18n pages:', built, 'card specs:', specs.length);
