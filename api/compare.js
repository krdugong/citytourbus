const fs = require('fs');
const path = require('path');

const CLEAN_PATHS = new Set(['paris','london','rome','barcelona','dubai','berlin','madrid','sydney']);

const CITIES = {
  paris:['파리','프랑스','🗼'], london:['런던','영국','🎡'], rome:['로마','이탈리아','🏛'],
  barcelona:['바르셀로나','스페인','🏖'], berlin:['베를린','독일','🏙'], madrid:['마드리드','스페인','💃'],
  lisbon:['리스본','포르투갈','🐟'], amsterdam:['암스테르담','네덜란드','🌷'], prague:['프라하','체코','🏰'],
  budapest:['부다페스트','헝가리','🌉'], edinburgh:['에든버러','영국','🏴'], dublin:['더블린','아일랜드','🍀'],
  athens:['아테네','그리스','🏛'], copenhagen:['코펜하겐','덴마크','🧜'], stockholm:['스톡홀름','스웨덴','👑'],
  oslo:['오슬로','노르웨이','🏔'], helsinki:['헬싱키','핀란드','🦌'], reykjavik:['레이캬비크','아이슬란드','🌋'],
  seville:['세비야','스페인','💃'], porto:['포르투','포르투갈','🍷'], warsaw:['바르샤바','폴란드','🦅'],
  tallinn:['탈린','에스토니아','🏰'], malaga:['말라가','스페인','☀️'], split:['스플리트','크로아티아','🌊'],
  galway:['골웨이','아일랜드','🍀'], dubai:['두바이','UAE','🏙'], 'abu-dhabi':['아부다비','UAE','🕌'],
  sharjah:['샤르자','UAE','🕌'], 'cape-town':['케이프타운','남아공','🦁'], johannesburg:['요하네스버그','남아공','💎'],
  tokyo:['도쿄','일본','🗾'], sydney:['시드니','호주','🦘'], bangkok:['방콕','태국','🐘'], hanoi:['하노이','베트남','🌿'],
  'new-york':['뉴욕','미국','🗽'], chicago:['시카고','미국','🌬'], 'los-angeles':['LA·할리우드','미국','🎬'],
  'san-francisco':['샌프란시스코','미국','🌉'], 'las-vegas':['라스베이거스','미국','🎰'], miami:['마이애미','미국','🌴'],
  'washington-dc':['워싱턴DC','미국','🏛'], toronto:['토론토','캐나다','🍁'], seattle:['시애틀','미국','🌧'],
  philadelphia:['필라델피아','미국','🔔'], 'new-orleans':['뉴올리언스','미국','🎷']
};

function esc(value) {
  return String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}

function replaceMeta(html, pattern, tag) {
  if (pattern.test(html)) return html.replace(pattern, tag);
  return html.replace('</head>', `${tag}\n</head>`);
}

module.exports = function handler(req, res) {
  try {
    const file = path.join(process.cwd(), 'compare.html');
    let html = fs.readFileSync(file, 'utf8');
    const rawCity = Array.isArray(req.query && req.query.city) ? req.query.city[0] : (req.query && req.query.city);
    const slug = typeof rawCity === 'string' ? rawCity.trim().toLowerCase() : '';
    const city = CITIES[slug] || null;

    const styleTag = '<link rel="stylesheet" href="/compare-redesign.css">';
    const scriptTag = '<script src="/live-prices.js" defer></script>';
    if (!html.includes('/compare-redesign.css')) html = html.replace('</head>', `${styleTag}\n</head>`);
    if (!html.includes('/live-prices.js')) html = html.replace('</body>', `${scriptTag}\n</body>`);

    const title = city
      ? `${city[0]} 시티투어버스 비교 | 홉온홉오프 가격·할인 | CITYTOURBUS`
      : '시티투어버스 비교 | 전세계 홉온홉오프 가격·할인 비교 | CITYTOURBUS';
    const description = city
      ? `${city[0]} 홉온홉오프 시티투어버스의 운영사, 현재 확인 가격과 할인 조건을 비교하세요. 예약 전 노선과 프로모션 조건을 한눈에 확인할 수 있습니다.`
      : '전 세계 주요 도시의 홉온홉오프 시티투어버스 운영사, 현재 확인 가격과 할인 조건을 비교하세요.';
    const canonical = city
      ? (slug === 'new-york'
          ? 'https://www.citytourbus.kr/new-york-city-tour-bus'
          : (CLEAN_PATHS.has(slug)
              ? `https://www.citytourbus.kr/${slug}-city-tour-bus`
              : `https://www.citytourbus.kr/compare?city=${encodeURIComponent(slug)}`))
      : 'https://www.citytourbus.kr/compare';

    html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${esc(title)}</title>`);
    html = replaceMeta(html, /<meta\s+name=["']description["'][^>]*>/i, `<meta name="description" content="${esc(description)}">`);
    html = replaceMeta(html, /<link\s+rel=["']canonical["'][^>]*>/i, `<link rel="canonical" href="${esc(canonical)}">`);
    html = replaceMeta(html, /<meta\s+property=["']og:title["'][^>]*>/i, `<meta property="og:title" content="${esc(title)}">`);
    html = replaceMeta(html, /<meta\s+property=["']og:description["'][^>]*>/i, `<meta property="og:description" content="${esc(description)}">`);
    html = replaceMeta(html, /<meta\s+property=["']og:url["'][^>]*>/i, `<meta property="og:url" content="${esc(canonical)}">`);

    if (city) {
      const fallback = `<div id="area"><div class="city-hd"><div class="city-hd-flag">${esc(city[2])}</div><div class="city-hd-name">${esc(city[0])}</div><div class="city-hd-meta">${esc(city[1])} · 시티투어버스 비교</div></div><p style="font-size:13px;color:#6e6e73;line-height:1.8;margin-bottom:24px">${esc(city[0])}의 홉온홉오프 시티투어버스 운영사, 가격과 할인 조건을 비교합니다. 브라우저에서 상세 상품과 최신 확인 가격을 불러오는 중입니다.</p></div>`;
      html = html.replace('<div id="area"></div>', fallback);
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=300, stale-while-revalidate=3600');
    res.status(200).send(html);
  } catch (error) {
    res.status(500).send('Unable to render comparison page');
  }
};
