// Builds the hop-on hop-off bus simulator: one data file (simulator-data.js) and one page per city
// (<city>-bus-simulator.html). Stop coordinates come from the route checkers (route-check-data.js for most cities,
// the inline scripts of hong-kong-route-check.html / new-york-route-check.html for those two); tickets, booking
// links and headways come from the city page JSON in data/keyword-pages. Cities: data/simulator/cities.json.
// Safe to run again. Usage (from repo root): node scripts/simulator/build.mjs
import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';
import { TAG, PRECONNECT, fontLinks, ICONS } from '../head-bits.mjs';

const SITE = 'https://www.citytourbus.kr';
const TODAY = new Date().toISOString().slice(0, 10);
const cities = JSON.parse(fs.readFileSync('data/simulator/cities.json', 'utf8'));
const esc = v => String(v ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));

// --- route-check data (paris, london, rome, dubai, barcelona) ---
const rcSrc = fs.readFileSync('route-check-data.js', 'utf8');
const rc = vm.runInNewContext('(' + rcSrc.replace(/^window\.ROUTE_CHECK_DATA\s*=/, '').replace(/;\s*$/, '') + ')', {});

// --- inline route checkers (hong-kong, new-york): const routes={...}; const pois=[...]; ---
function inlineData(file) {
  const html = fs.readFileSync(file, 'utf8');
  const m = html.match(/const routes=\{[\s\S]*?\n\};\nconst pois=\[[\s\S]*?\n\];/);
  if (!m) throw new Error(`routes/pois block not found in ${file}`);
  const ctx = {};
  vm.runInNewContext(m[0] + ';this.routes=routes;this.pois=pois;', ctx);
  const pm = html.match(/const plannerPois=\[[\s\S]*?\n\s*\];/);
  if (pm) { const c2 = {}; vm.runInNewContext(pm[0] + ';this.p=plannerPois;', c2); ctx.pois = c2.p; }
  return ctx;
}
const inlineMeta = {
  'hong-kong': { center: [22.275, 114.171], zoom: 12, bounds: [[22.213, 114.145], [22.322, 114.214]], operator: 'Big Bus Tours', source: 'https://www.bigbustours.com/en/hong-kong/routes', verified: '2026-10-18' },
  'new-york': { center: [40.748, -73.986], zoom: 13, bounds: [[40.702, -74.016], [40.783, -73.959]], operator: 'Big Bus Tours', source: 'https://www.bigbustours.com/en/new-york/routes', verified: '2026-10-18' },
};

const minutes = s => {
  if (!s) return null;
  const h = s.match(/(\d+)\s*시간/), m = s.match(/(\d+)\s*분/);
  if (!h && !m) return null;
  return (h ? +h[1] * 60 : 0) + (m ? +m[1] : 0);
};
const headway = s => {
  if (!s) return null;
  if (/매시/.test(s)) return 60;
  const r = s.match(/(\d+)\s*[~–-]\s*(\d+)\s*분/);
  if (r) return Math.round((+r[1] + +r[2]) / 2);
  const one = s.match(/(\d+)\s*분/);
  return one ? +one[1] : null;
};

const out = {};
for (const [key, c] of Object.entries(cities)) {
  const page = JSON.parse(fs.readFileSync(`data/keyword-pages/${c.slug}.json`, 'utf8'));
  let base;
  if (fs.existsSync(`data/simulator/${key}.json`)) base = JSON.parse(fs.readFileSync(`data/simulator/${key}.json`, 'utf8'));
  else if (rc[key]) base = rc[key];
  else { const d = inlineData(`${key}-route-check.html`); base = { ...inlineMeta[key], routes: d.routes, pois: d.pois }; }
  const routes = {};
  Object.entries(base.routes).forEach(([rk, r], i) => {
    const pr = page.routes?.[i] || {};
    const stops = r.stops.filter(s => !s.inactive).map(s => ({ n: s.n, ko: s.ko, en: s.en || '', lat: s.lat, lng: s.lng, addr: s.addr || '', first: s.first || '', last: s.last || '' }));
    routes[rk] = {
      ko: r.ko, en: r.en || '', color: r.color,
      headway: headway(r.frequency) || headway(pr.interval) || 20,
      loopMin: minutes(r.duration) || minutes(pr.duration) || null,
      hours: pr.hours || '', stops,
    };
  });
  const pois = base.pois.map(p => ({ id: p.id, ko: p.ko, en: p.en || '', lat: p.lat, lng: p.lng, aliases: p.aliases || [] }));
  const tickets = (page.tickets || []).map(t => ({ name: t.name, validity: t.validity, price: t.price }));
  out[key] = {
    key, ko: c.ko, en: c.en, brand: c.brand, operator: base.operator, source: base.source, verified: base.verified,
    center: base.center, zoom: base.zoom, bounds: base.bounds, startStop: c.startStop,
    page: { url: `/${c.slug}`, title: page.keyword || page.title, booking: page.booking, tickets, routeCheck: fs.existsSync(`${key}-route-check.html`) ? `/${key}-route-check` : null, affiliate: page.affiliate !== false },
    routes, pois,
    links: (c.links || []).map(l => ({ from: l.from, to: l.to, min: l.min, icon: l.icon || '🚇', label: l.label })),
  };
}
fs.writeFileSync('simulator-data.js', 'window.SIM_DATA=' + JSON.stringify(out) + ';\n');

// --- pages ---
// cache-buster for the page's js/css/data: changes whenever any of them changes
const V = crypto.createHash('md5').update(fs.readFileSync('bus-simulator.js')).update(fs.readFileSync('bus-simulator.css')).update(JSON.stringify(out)).digest('hex').slice(0, 10);
for (const [key, d] of Object.entries(out)) {
  const name = `${d.ko} ${d.brand}`;
  const title = `${name} 시뮬레이터 | 가고 싶은 곳 입력하면 노선·하차 정류장 자동 추천`;
  const desc = `${d.ko}에서 가고 싶은 곳을 고르면 어떤 ${d.brand} 노선을 타고 어디서 내려야 하는지 하루 코스로 짜 드립니다. 지도 위에서 버스가 움직이며 하차 정류장과 도보 거리를 보여줍니다.`;
  const url = `${SITE}/${key}-bus-simulator`;
  const routeList = Object.values(d.routes).map(r => r.ko).join(' · ');
  const poiExamples = d.pois.slice(0, 3).map(p => p.ko).join(', ');
  const faq = [
    [`${d.ko} ${d.brand} 시뮬레이터는 어떻게 쓰나요?`, `가고 싶은 관광지·맛집·호텔을 2곳 이상 고르고 ‘코스 만들기’를 누르면 탑승 정류장, 노선, 하차 정류장, 도보 거리, 예상 시각이 순서대로 나옵니다. ‘재생’을 누르면 지도 위에서 버스가 코스를 따라 움직입니다.`],
    [`예상 시간은 얼마나 정확한가요?`, `정류장 간 직선거리와 공식 한 바퀴 소요 시간, 배차 간격을 바탕으로 계산한 추정치입니다. 실제 교통 상황과 대기 시간에 따라 달라질 수 있으니 여유 있게 잡으세요.`],
    [`목록에 없는 장소도 넣을 수 있나요?`, `검색창에 상호명이나 호텔 이름을 입력하고 ‘지도에서 찾기’를 누르면 OpenStreetMap에서 찾아 코스에 추가합니다.`],
    [`어떤 티켓을 사야 하나요?`, `코스 결과 아래에 하루 코스에 맞는 티켓을 추천합니다. 노선이 2개 이상이거나 장소가 많으면 48시간권이 유리할 수 있습니다. 자세한 가격은 <a href="${d.page.url}">${esc(d.page.title)} 총정리</a>를 참고하세요.`],
  ];
  const ld = {
    '@context': 'https://schema.org', '@graph': [
      { '@type': 'WebApplication', name: `${name} 시뮬레이터`, url, applicationCategory: 'TravelApplication', operatingSystem: 'Web', inLanguage: 'ko', description: desc, offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' } },
      { '@type': 'FAQPage', mainEntity: faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a.replace(/<[^>]+>/g, '') } })) },
      { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: '홈', item: SITE + '/' }, { '@type': 'ListItem', position: 2, name: d.page.title, item: SITE + d.page.url }, { '@type': 'ListItem', position: 3, name: `${name} 시뮬레이터`, item: url }] },
    ],
  };
  const html = `<!DOCTYPE html><html lang="ko"><head>
${TAG}<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1"><link rel="canonical" href="${url}">
<meta property="og:type" content="website"><meta property="og:locale" content="ko_KR"><meta property="og:site_name" content="CITYTOURBUS"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${url}"><meta property="og:image" content="${SITE}/og-image.png"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta name="twitter:card" content="summary_large_image">
${PRECONNECT}${fontLinks()}
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<link rel="stylesheet" href="/bus-simulator.css?v=${V}">
${ICONS}
<script type="application/ld+json">${JSON.stringify(ld)}</script>
</head><body data-city="${key}">
<div class="topbar"><a class="brand" href="/"><b>CITY</b>TOURBUS.KR</a><span class="sub">${esc(d.ko)} ${esc(d.brand)} 시뮬레이터</span><a class="back" href="${d.page.url}">${esc(d.ko)} ${esc(d.brand)} 총정리</a></div>
<section class="hero"><div class="eyebrow">${esc(d.operator)} · ${esc(d.ko)}</div><h1>${esc(d.ko)} ${esc(d.brand)} 시뮬레이터<br><span>가고 싶은 곳만 고르면 하루 코스가 나옵니다</span></h1><p>관광지·맛집·호텔을 고르면 <strong>어느 노선을 타고 어디서 내릴지</strong>를 순서대로 계산하고, 지도 위에서 버스가 코스를 따라 움직이며 <strong>하차 정류장과 도보 거리</strong>를 보여줍니다. 노선: ${esc(routeList)}.</p><div class="source-note">정류장·노선: 공식 페이지 기준 ${esc(d.verified)} · <a href="${esc(d.source)}" target="_blank" rel="noopener nofollow">공식 노선 확인</a>${d.page.routeCheck ? ` · <a href="${d.page.routeCheck}">정류장만 찾기(루트체커)</a>` : ''}</div></section>
<main class="wrap"><div class="sim" id="sim">
<aside class="panel">
  <div class="panel-block">
    <div class="kicker">1 · 가고 싶은 곳</div>
    <form class="search" id="placeForm" autocomplete="off"><input id="placeInput" placeholder="예: ${esc(poiExamples)}, 호텔 이름" aria-label="장소 검색"><button type="submit" id="placeBtn">지도에서 찾기</button><div class="suggest" id="suggest"></div></form>
    <div class="status" id="placeStatus"></div><div class="place-results" id="placeResults"></div>
    <div class="quick" id="quick"></div>
  </div>
  <div class="panel-block">
    <div class="kicker">2 · 내 코스 <span id="count"></span></div>
    <ol class="chosen" id="chosen"></ol>
    <div class="row"><label>출발 정류장 <select id="startSel"></select></label><label>출발 시각 <input type="time" id="startTime" value="09:30"></label></div>
    <button type="button" class="go" id="go">코스 만들기</button>
    <div class="hint">장소를 2곳 이상 고르면 가장 적게 갈아타고 적게 걷는 순서로 정렬합니다.</div>
  </div>
</aside>
<section class="stage">
  <div class="mapwrap"><div id="map"></div>
    <div class="player" id="player" hidden><button type="button" id="play">▶ 재생</button><button type="button" id="reset">⏮ 처음</button><div class="speed"><button type="button" data-speed="1" aria-pressed="true">1x</button><button type="button" data-speed="2" aria-pressed="false">2x</button><button type="button" data-speed="4" aria-pressed="false">4x</button></div><div class="now" id="now"></div></div>
    <div class="legend">● 정류장 · ★ 선택 장소 · <span class="legend-off">하차</span> 하차 정류장</div>
  </div>
  <div class="result" id="result"><div class="empty"><h2>어디 가고 싶으세요?</h2><p>왼쪽에서 장소를 고르고 ‘코스 만들기’를 누르면 여기에 탑승·하차 순서가 나옵니다.</p></div></div>
</section>
</div></main>
<section class="faq"><h2>${esc(d.ko)} ${esc(d.brand)} 시뮬레이터 자주 묻는 질문</h2>${faq.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${a}</p></details>`).join('')}
<p class="foot">이 시뮬레이터는 CITYTOURBUS.KR가 공식 정류장 정보를 바탕으로 만든 안내 도구입니다. 운행 시간·요금은 <a href="${d.page.url}">${esc(d.page.title)} 총정리</a>와 공식 사이트에서 다시 확인하세요. 다른 도시: ${Object.entries(out).filter(([k]) => k !== key).map(([k, o]) => `<a href="/${k}-bus-simulator">${esc(o.ko)}</a>`).join(' · ')}</p></section>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script src="/simulator-data.js?v=${V}"></script>
<script src="/bus-simulator.js?v=${V}"></script>
</body></html>
`;
  fs.writeFileSync(`${key}-bus-simulator.html`, html);
}

// --- sitemap ---
let sm = fs.readFileSync('sitemap.xml', 'utf8');
let added = 0;
for (const key of Object.keys(out)) {
  const loc = `${SITE}/${key}-bus-simulator`;
  if (sm.includes(`<loc>${loc}</loc>`)) continue;
  sm = sm.replace('</urlset>', `  <url><loc>${loc}</loc><lastmod>${TODAY}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>\n</urlset>`);
  added++;
}
fs.writeFileSync('sitemap.xml', sm);
console.log(`simulator: ${Object.keys(out).length} cities, sitemap +${added}`);
