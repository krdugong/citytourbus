// Builds keyword landing pages (e.g. /hong-kong-big-bus) from data/keyword-pages/*.json.
// Usage (from repo root): node scripts/keyword-pages/build.mjs
// Card images are made separately by scripts/keyword-pages/make-cards.sh (macOS).
//
// Page JSON fields (optional ones marked ?):
//   slug, keyword, city, flag, published?, updated, verified, title, description, h1Sub, lead, aka?[],
//   (published = the day the URL first went live, kept fixed; updated = last content change. JSON-LD
//   datePublished uses published; dateModified, the sitemap lastmod, article:published_time and the RSS pubDate
//   use updated, because Naver shows that date in search results ("2주 전") and the pages are revised monthly.)
//   booking{url,label}, official, routeCheck?{url,label}, cityGuide?{url,label},
//   summary[[k,v]], routes[{color,name,area?,en,duration,interval,hours,stops?[],tip}],
//   night?{time,start,duration,price,text}, tickets[{name,validity,price,includes[],for}], priceNote, payCurrency?,
//   onsite?{text,compare[[k,v]]}, extra?[{id,label,h2,image?,paras?[],table?[[k,v]]}],
//   howToBook?[], howToRide?[] (Big Bus defaults used when operator is "bigbus"),
//   h2?{route,night,price,booking,onsite,ride,topics,faq}, topics?[{h3,a,anchor,label}] (scripts/keyword-pages/topics.py), faq[{q,a}], images{key:{alt,eyebrow,title,sub,bg}},
//   asideNote, operator?, affiliate? (false = booking button goes to the operator's own site)
//   parent? (slug of the city page this operator page belongs to), cityKey? (GetYourGuide/card city when the slug
//   has another suffix), fromParent?{sectionId: link label} (link added to that section of the parent page),
//   courses? (true = fixed-course tours: no transfer labels or hop-on loop note), childCard?{title,desc,order?} (card in the parent's "종류별로 자세히" block), rideCard?{title,desc,order?} + busTip? (a non-bus ride such as a go-kart or rickshaw: card in the parent's "함께 타볼 만한 탈것" block instead), oneWay? (with courses: point-to-point lines such as a water bus). topics[].anchor may also be a /path.
import fs from 'node:fs';
import path from 'node:path';
import { TAG, ICONS, PRECONNECT, fontLinks } from '../head-bits.mjs';
import { alternates, langLinks } from '../i18n/links.mjs';

const ROOT = process.cwd();
const SITE = 'https://www.citytourbus.kr';
const DATA_DIR = path.join(ROOT, 'data/keyword-pages');
const RIDE_PICKS = fs.existsSync(path.join(DATA_DIR, '_ride-picks.json')) ? JSON.parse(fs.readFileSync(path.join(DATA_DIR, '_ride-picks.json'), 'utf8')) : { cities: {}, kinds: {} };
const GYG = JSON.parse(fs.readFileSync(path.join(DATA_DIR, '_getyourguide.json'), 'utf8'));
const cityKeyOf = (p) => p.cityKey || p.slug.replace(/-(big-bus|city-tour-bus)$/, '');
const gygUrl = (p) => {
  const loc = GYG.cities[cityKeyOf(p)];
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

// Price parsing shared by the price bars and the card-payment tip (currency symbol → ISO code for the tip).
// No won conversion on purpose: the user found "약 N원" made prices look higher and could be read as a won charge.
const CUR_CODE = { '€': 'EUR', '유로': 'EUR', 'US$': 'USD', '$': 'USD', '달러': 'USD', '£': 'GBP', '¥': 'JPY', '엔': 'JPY', 'HK$': 'HKD', 'S$': 'SGD', 'AU$': 'AUD', 'CA$': 'CAD', 'C$': 'CAD', 'NZ$': 'NZD', '฿': 'THB', '바트': 'THB', '₫': 'VND', '동': 'VND', 'AED': 'AED', 'CHF': 'CHF', 'SEK': 'SEK', 'NOK': 'NOK', 'DKK': 'DKK', 'zł': 'PLN', 'Kč': 'CZK', 'Ft': 'HUF', 'R': 'ZAR', 'CZK': 'CZK', 'PLN': 'PLN', 'ISK': 'ISK', 'SAR': 'SAR', 'THB': 'THB', 'VND': 'VND', 'ZAR': 'ZAR' };
const PRICE_RX = /(US\$|AU\$|HK\$|CA\$|NZ\$|S\$|R\$|C\$|[€£¥₩$฿₫]|AED|CHF|CZK|PLN|ISK|SAR|THB|VND|ZAR|kr|zł|Kč|Ft|SEK|NOK|DKK|R)\s?([\d,]+(?:\.\d+)?)|([\d,]+(?:\.\d+)?)(?:\s?[~–-]\s?[\d,]+(?:\.\d+)?)?\s?(원|엔|유로|달러|바트|동|루피)/g;
// lowest adult amount in a price string → {num, cur, label}; null when nothing parses. Text after a child/senior
// label ("… · 어린이 1,200엔") is ignored so the figure is always the adult price.
const NON_ADULT_RX = /어린이|소인|아동|유아|청소년|학생|경로|65세|장애인|child|youth|senior|kid/i;
function lowestPrice(s) {
  let best = null;
  const adult = String(s).split(NON_ADULT_RX)[0];
  for (const m of adult.matchAll(PRICE_RX)) {
    const num = parseFloat((m[2] || m[3]).replace(/,/g, ''));
    const cur = m[1] || m[4];
    if (!isNaN(num) && (!best || num < best.num)) best = { num, cur, label: m[1] ? `${m[1]}${/^[A-Z]{3}$/.test(m[1]) ? ' ' : ''}${m[2]}` : `${m[3]}${m[4]}` };
  }
  return best;
}
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
  const out = { overview: null, perRoute: [], uncertain: [] };
  const overview = `img/${p.slug}/${p.slug}-map.jpg`;
  if (fs.existsSync(path.join(ROOT, overview))) out.overview = `/${overview}`;
  const dataFile = path.join(ROOT, 'data/route-maps', `${p.slug}.json`);
  if (fs.existsSync(dataFile)) {
    for (const r of JSON.parse(fs.readFileSync(dataFile, 'utf8')).routes) {
      out.uncertain.push(...r.stops.filter(s => s.uncertain).map(s => s.name));
      const f = `img/${p.slug}/${p.slug}-map-${r.key}.jpg`;
      out.perRoute.push(fs.existsSync(path.join(ROOT, f)) ? { src: `/${f}`, title: r.title || r.name } : null);
    }
  }
  return out;
}
const mapFigure = (src, alt, note = '') => `<figure class="kw-figure kw-map"><img src="${src}" alt="${esc(alt)}" width="1080" height="1080" loading="lazy" decoding="async"><figcaption>${esc(alt)} · 정류장 순서 기준 참고용${note ? ` · ${esc(note)}` : ''} · © OpenStreetMap contributors</figcaption></figure>`;
const BRAND = { bigbus: '빅버스', 'city-sightseeing': '시티 사이트싱' };
// the booking button says which operator it opens (빅버스 / 시티 사이트싱); other operators keep their own label
const bookLabel = (p) => BRAND[p.operator] ? `${BRAND[p.operator]} 공식 예약하기` : p.booking.label;
const cta = (p) => `<a class="button kw-cta" href="${esc(p.booking.url)}" target="_blank" rel="${p.affiliate === false ? 'nofollow noopener' : 'sponsored nofollow noopener'}">${esc(bookLabel(p))} →</a>`;
// Stop-order diagram per route (metro-map style list; transfers = stops shared by 2+ routes)
function routeDiagram(p) {
  const norm = s => s.replace(/\s*\((환승|transfer)\)/i, '').trim();
  const inRoutes = {};
  p.routes.forEach(r => new Set((r.stops || []).map(norm)).forEach(st => (inRoutes[st] = inRoutes[st] || []).push(r.name.replace(/ \(.*\)/, ''))));
  return p.routes.map(r => {
    const stops = r.stops || [];
    if (!stops.length) return '';
    const items = stops.map((st, i) => {
      // fixed-course tours (courses: true) share sights, not stops, so there is nothing to transfer at
      const others = p.courses ? [] : (inRoutes[norm(st)] || []).filter(n => n !== r.name.replace(/ \(.*\)/, ''));
      return `<li${others.length ? ' class="tr"' : ''}><span class="n">${i + 1}</span>${esc(norm(st))}${others.length ? `<small>환승 · ${esc(others.join(', '))}</small>` : ''}</li>`;
    }).join('');
    return `<ol class="kw-line" style="--rc:${r.color}" aria-label="${esc(r.name)} 정류장 순서">${items}</ol>${p.oneWay ? '<p class="small kw-loop">→ 편도 노선 · 원하는 선착장에서 내립니다</p>' : p.courses ? '<p class="small kw-loop">↻ 출발지로 돌아오는 코스 · 중간 경유지는 차창 관광</p>' : `<p class="small kw-loop">↻ 순환 노선 · ${stops.length}번 다음은 다시 1번 정류장</p>`}`;
  });
}
// Ticket price bars: lowest number in each price string, only when 2+ tickets share one currency
function priceBars(p) {
  const rows = [];
  for (const t of p.tickets) {
    const best = lowestPrice(t.price);
    if (best) rows.push({ name: t.name, validity: t.validity, ...best });
  }
  if (rows.length < 2 || new Set(rows.map(r => r.cur)).size !== 1) return '';
  const max = Math.max(...rows.map(r => r.num));
  return `<div class="kw-bars" role="img" aria-label="${esc(p.keyword)} 티켓별 가격 비교">${rows.map(r => `<div class="kw-bar"><span class="kw-bar-l">${esc(r.name)}<small>${esc(r.validity)}</small></span><span class="kw-bar-t"><i style="width:${Math.max(4, Math.round(r.num / max * 100))}%"></i></span><span class="kw-bar-v">${esc(r.label)}</span></div>`).join('')}<p class="small">티켓별 성인 최저가 기준 · 자세한 조건은 아래 표</p></div>`;
}
// Korean cardholders pay 3–8% more when a foreign checkout bills them in won (DCC); shown on every foreign-currency page
function payTip(p) {
  const cur = (p.tickets.map(t => lowestPrice(t.price)).find(Boolean) || {}).cur;
  if (!cur || cur === '원' || cur === '₩') return '';
  const code = CUR_CODE[cur] || '현지 통화';
  // payCurrency: the booking page bills in another currency than the local prices shown (City Sightseeing → EUR)
  const pick = p.payCurrency ? `예약 버튼의 공식 예약 페이지는 ${esc(p.payCurrency)}로 결제됩니다. 결제 화면에 원화(KRW)와 ${esc(p.payCurrency)} 선택이 나오면 <b>${esc(p.payCurrency)}</b>를 고르세요.` : `결제 화면에 원화(KRW)와 현지 통화 선택이 나오면 <b>${esc(code)}(현지 통화)</b>를 고르세요.`;
  return `<div class="kw-callout"><b>한국 카드로 결제할 때</b><p>${pick} 원화 결제(DCC)를 택하면 3~8%가 더 붙습니다. 해외결제 수수료가 없는 트래블카드를 쓰면 가장 저렴하고, 결제 전 카드사 해외 사용 설정이 켜져 있는지 확인하세요.</p></div>`;
}
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
  const parent = p.parent ? all.find(o => o.slug === p.parent) : null;
  const children = all.filter(o => o.parent === p.slug).sort((a, b) => ((a.childCard || {}).order || 9) - ((b.childCard || {}).order || 9));
  const sec = (id, label, title, tocLabel, body) => {
    const sub = children.filter(c => c.fromParent && c.fromParent[id]).map(c => `<p class="kw-sublink"><a href="/${c.slug}">${esc(c.fromParent[id])} →</a></p>`).join('');
    sections.push(`<section id="${id}" class="card"><p class="section-no">${String(++n).padStart(2, '0')} · ${label}</p><h2>${esc(title)}</h2>${body}${sub}</section>`);
    if (tocLabel) toc.push(`<a href="#${id}">${esc(tocLabel)}</a>`);
  };

  // Other spellings people search with (Naver autocomplete), shown as a plain "also known as" row
  const aka = p.aka || (/빅버스$/.test(k)
    ? [`${p.city} 빅버스 투어`, `${p.city} 시티투어버스`, `${p.city} 시티투어 버스`, `${p.city} 2층버스 투어`, `${p.city} 홉온홉오프 버스`, `${p.city} 관광버스`]
    : [`${p.city} 시티투어 버스`, `${p.city} 버스투어`, `${p.city} 2층버스 투어`, `${p.city} 홉온홉오프 버스`, `${p.city} 관광버스`, ...(p.operator === 'city-sightseeing' ? [`${p.city} City Sightseeing`] : [])]);
  sec('summary', 'SUMMARY', `${k} 한눈에 보기`, '한눈에 보기', kvTable([['다른 이름', aka.join(', ')], ...p.summary], 'kw-summary') +
    (parent ? `<p class="kw-sublink"><a href="/${parent.slug}">${esc(parent.keyword)} ${p.rideCard ? '노선·가격 보기' : '전체 비교 보기'} →</a></p>` : ''));
  // Ride pages point readers back to the city's bus page: the bus is the site's main product.
  if (p.rideCard && parent) sec('bus', 'CITY TOUR BUS', `${p.keyword}와 함께 ${parent.keyword} 타기`, '시티투어버스',
    `<p>${esc(p.busTip || `${p.keyword} 앞뒤로 ${parent.keyword}를 타면 ${p.city}의 다른 명소까지 하루에 이어서 돌 수 있습니다.`)}</p><div class="kw-kids"><a class="kw-kid" href="/${parent.slug}"><b>${esc(parent.keyword)}</b><span>${esc(parent.asideNote)}</span><em>노선·가격·예약 보기 →</em></a></div>`);
  const kids = children.filter(c => !c.rideCard);
  const rides = children.filter(c => c.rideCard).sort((a, b) => (a.rideCard.order || 9) - (b.rideCard.order || 9));
  if (kids.length) sec('types', 'TYPES', `${k} 종류별로 자세히 보기`, '종류별 자세히',
    `<div class="kw-kids">${kids.map(c => `<a class="kw-kid" href="/${c.slug}"><b>${esc((c.childCard || {}).title || c.keyword)}</b><span>${esc((c.childCard || {}).desc || c.asideNote)}</span><em>노선·가격·예약 자세히 →</em></a>`).join('')}</div>`);

  const routeNames = p.routes.map(r => `${r.name.replace(/ \(.*\)/, '')}${r.area ? `(${r.area})` : ''}`).join(', ');
  const map = routeMap(p);
  const diagram = routeDiagram(p);
  sec('route', 'ROUTE', h2.route, '노선',
    (map.overview ? mapFigure(map.overview, `${k} 노선도`, map.uncertain.length ? `${map.uncertain.join(', ')} 위치는 대략적인 추정` : '') : '') +
    `<p>${esc(k)}는 ${esc(routeNames)} ${p.routes.length > 1 ? `${p.routes.length}개 ${p.courses ? '코스' : '노선'}으로` : `${p.courses ? '코스' : '노선'} 하나로`} 운행합니다.${p.routeCheck ? ` 정류장 위치는 <a href="${esc(p.routeCheck.url)}">${esc(p.routeCheck.label)}</a>에서 지도로 볼 수 있습니다.` : ''}${SIM[p.slug] ? ` 가고 싶은 곳을 넣으면 탈 노선과 내릴 정류장을 순서대로 짜 주는 <a href="${SIM[p.slug].url}">${esc(SIM[p.slug].label)}</a>도 있습니다.` : ''}</p>` +
    `<div class="kw-route-grid">` + p.routes.map((r, i) => `<div class="kw-route" style="--rc:${r.color}"><h3>${esc(k)} ${esc(r.name)}${r.area ? ` · ${esc(r.area)}` : ''}</h3><p class="small">${esc(r.en)} · ${esc(r.duration)} · ${esc(r.interval)} · ${esc(r.hours)}</p>${diagram[i] || ''}<p>${esc(r.tip)}</p>${map.perRoute[i] ? mapFigure(map.perRoute[i].src, `${k} ${map.perRoute[i].title} 노선도`) : ''}</div>`).join('') + `</div>`);

  if (p.night) sec('night', 'NIGHT TOUR', h2.night, '나이트 투어',
    `<p>${esc(p.night.text)}</p><ul><li><b>출발</b> ${esc(p.night.time)}</li><li><b>출발 장소</b> ${esc(p.night.start)}</li><li><b>소요 시간</b> ${esc(p.night.duration)}</li><li><b>가격</b> ${esc(p.night.price)}</li></ul>`);

  sec('price', 'PRICE', h2.price, '가격',
    priceBars(p) +
    `<div class="table-scroll"><table><thead><tr><th>티켓</th><th>유효</th><th>성인 가격</th><th>포함 내용</th><th>추천</th></tr></thead><tbody>${p.tickets.map(t => `<tr><th scope="row">${esc(t.name)}</th><td>${esc(t.validity)}</td><td>${esc(t.price)}</td><td>${t.includes.map(esc).join('<br>')}</td><td>${esc(t.for)}</td></tr>`).join('')}</tbody></table></div><p class="small">${esc(p.priceNote)}</p>`);

  // Rides next to the bus, right under the prices: this site's own ride pages first, then GetYourGuide's
  // most-reviewed ride products for the city (data/keyword-pages/_ride-picks.json, scripts/keyword-pages/ride_picks.py).
  const rideUrl = (x) => `https://www.getyourguide.com/ko-kr${x.u}?${GYG.partner}&cmp=citytourbuskr-${cityKeyOf(p)}-ride`;
  const ridePicks = p.parent ? [] : (RIDE_PICKS.cities[cityKeyOf(p)] || []).filter(x => !rides.some(c => c.booking && c.booking.url.includes(`-t${x.id}/`)));
  if (rides.length || ridePicks.length) sec('rides', 'RIDES', `${p.city} 시티투어버스와 함께 타볼 만한 탈것`, '이색 탈것',
    `<p>버스로 도시를 돈 날 같이 타 보기 좋은 체험입니다.${ridePicks.length ? ' GetYourGuide에서 후기가 많은 순서로 골랐습니다.' : ''}</p><div class="kw-kids">` +
    rides.map(c => `<a class="kw-kid" href="/${c.slug}"><b>${esc(c.rideCard.title)}</b><span>${esc(c.rideCard.desc)}</span><em>가격·예약 자세히 →</em></a>`).join('') +
    ridePicks.map(x => `<a class="kw-kid" href="${esc(`https://www.getyourguide.com/ko-kr${x.u}?${GYG.partner}&cmp=citytourbuskr-${cityKeyOf(p)}-ride`)}" target="_blank" rel="sponsored nofollow noopener"><b>${esc(x.n)}</b><span>${esc(RIDE_PICKS.kinds[x.k] || '탈것')} · ★ ${x.r} · 후기 ${Number(x.c).toLocaleString('en-US')}개</span><em>GetYourGuide에서 보기 →</em></a>`).join('') +
    `</div>${ridePicks.length ? `<p class="small">후기 수·평점은 ${esc(RIDE_PICKS.checked)} GetYourGuide 기준이며 GetYourGuide 링크는 제휴 링크입니다.</p>` : ''}`);

  const short = (s) => s.length > 30 ? `${s.slice(0, 29)}…` : s;
  const asideRides = (rides.length || ridePicks.length) ? `<div class="kw-aside-rides"><b>함께 타볼 만한 탈것</b>${[
    ...rides.map(c => `<a href="/${c.slug}">${esc(c.rideCard.title)}</a>`),
    ...ridePicks.map(x => `<a href="${esc(rideUrl(x))}" target="_blank" rel="sponsored nofollow noopener">${esc(short(x.n))}</a>`)].slice(0, 3).join('')}<a class="kw-aside-more" href="#rides">탈것 전체 보기 →</a></div>` : '';

  for (const x of p.extra || []) {
    sec(x.id, x.label, x.h2, x.toc || null,
      (x.paras || []).map(t => `<p>${esc(t)}</p>`).join('') + (x.table ? kvTable(x.table) : ''));
  }

  sec('booking', 'BOOKING', h2.booking, '예약 방법',
    `<ol class="kw-steps">${howToBook.map(s => `<li>${esc(s)}</li>`).join('')}</ol>${payTip(p)}${cta(p)}`);

  const gyg = gygUrl(p);
  if (gyg) sec('more', 'MORE', `${p.city}를 더 풍요롭게 체험하기`, '투어 더 보기',
    `<p>시티투어버스 티켓 말고도 ${esc(p.city)}의 입장권, 가이드 투어, 근교 당일치기, 야경·크루즈 상품을 GetYourGuide에서 한 번에 비교할 수 있습니다. 24시간 전 무료 취소가 되는 상품이 많아 일정이 바뀌어도 부담이 적습니다.</p><a class="button kw-cta" href="${esc(gyg)}" target="_blank" rel="sponsored nofollow noopener">GetYourGuide에서 ${esc(p.city)} 투어·입장권 보기 →</a>`);

  if (p.onsite) sec('onsite', 'ON-SITE', h2.onsite, '현장구매',
    `<p>${esc(p.onsite.text)}</p>${kvTable(p.onsite.compare)}`);

  sec('ride', 'HOW TO RIDE', h2.ride, '타는법',
    `<ol class="kw-steps">${howToRide.map(s => `<li>${esc(s)}</li>`).join('')}</ol>`);

  if (p.topics && p.topics.length) sec('topics', 'TOPICS', h2.topics || `${k} 궁금한 점별 정리`, '궁금한 점',
    `<p class="small">네이버에서 많이 찾는 질문 순서대로, 이 페이지의 공식 정보 기준으로 짧게 답했습니다.</p>` +
    p.topics.map(t => `<div class="kw-topic"><h3>${esc(t.h3)}</h3><p>${t.a} <a href="${t.anchor.startsWith('/') ? esc(t.anchor) : `#${esc(t.anchor)}`}">${esc(t.label)} →</a></p></div>`).join(''));

  sec('faq', 'FAQ', h2.faq, 'FAQ', p.faq.map(f => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join(''));


  // Related cities: same country first, then the same region, in Korean-traveller popularity order (max 12) plus a
  // link to the full list. 105 links on every page read like a link farm and buried the useful neighbours.
  const others = all.filter(o => o.slug !== p.slug);
  const rank = (o) => { const i = POPULAR.indexOf(o.parent || o.slug); return (i < 0 ? 999 : i) + (o.parent ? 0.5 : 0); };
  const byRank = (a, b) => rank(a) - rank(b) || a.slug.localeCompare(b.slug);
  const sameCountry = others.filter(o => o.flag === p.flag).sort(byRank);
  const sameRegion = others.filter(o => o.flag !== p.flag && REGION[o.flag] === REGION[p.flag]).sort(byRank);
  const family = others.filter(o => o.slug === p.parent || (p.parent && o.parent === p.parent) || o.parent === p.slug);
  const picks = [...new Set([...family, ...sameCountry, ...sameRegion])].slice(0, 12);
  const related = [
    ...(p.cityGuide ? [[p.cityGuide.url, p.cityGuide.label]] : []),
    ...(p.routeCheck ? [[p.routeCheck.url, p.routeCheck.label.replace(/로 정류장 찾기$/, '')]] : []),
    ...(SIM[p.slug] ? [[SIM[p.slug].url, SIM[p.slug].label]] : []),
    ...picks.map(o => [`/${o.slug}`, `${o.flag} ${o.keyword}`])
  ];
  sections.push(`<section class="card related"><p class="section-no">함께 보기</p><h2>${esc(REGION_NAME[REGION[p.flag]] || '다른 도시')} 시티투어버스</h2><div class="related-links">${related.map(([h, t]) => `<a href="${esc(h)}">${esc(t)}</a>`).join('')}<a href="/" class="kw-all">전체 ${all.filter(o => !o.parent).length}개 도시 보기 →</a></div></section>`);

  const ogImg = `${SITE}/img/${p.slug}/${p.slug}-og.jpg`;
  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Article', '@id': `${url}#article`, headline: p.title, description: p.description,
        inLanguage: 'ko-KR', datePublished: published, dateModified: p.updated, mainEntityOfPage: url,
        image: [ogImg, `${SITE}${imgPath(p, 'main')}`, ...[map.overview, ...map.perRoute.map(x => x && x.src)].filter(Boolean).map(src => `${SITE}${src}`)],
        author: { '@type': 'Organization', name: 'CITYTOURBUS', url: `${SITE}/` },
        publisher: { '@type': 'Organization', name: 'CITYTOURBUS', logo: { '@type': 'ImageObject', url: `${SITE}/apple-touch-icon.png` } }
      },
      { '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: '홈', item: `${SITE}/` },
        ...(parent ? [{ '@type': 'ListItem', position: 2, name: parent.keyword, item: `${SITE}/${parent.slug}` }] : []),
        { '@type': 'ListItem', position: parent ? 3 : 2, name: k, item: url }
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
<meta property="article:published_time" content="${p.updated}T09:00:00+09:00"><meta property="article:modified_time" content="${p.updated}T09:00:00+09:00">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(p.title)}"><meta name="twitter:image" content="${ogImg}">
${ICONS}
${PRECONNECT}${fontLinks()}
<style>${INLINE_CSS}</style>
<script type="application/ld+json">${JSON.stringify(ld)}</script>
</head><body>
<header class="site-header"><div class="header-inner"><a class="logo" href="/"><span>CITY</span>TOURBUS<small>.KR</small></a><nav aria-label="주요 메뉴"><a href="/">전체 도시</a><a href="/compare">한눈에 비교</a><a href="/bus-simulator">시뮬레이터</a>${langLinks(p.slug, 'ko')}</nav></div></header>
<main><div class="wrap">
<nav class="breadcrumbs" aria-label="이동 경로"><a href="/">홈</a><span>›</span>${parent ? `<a href="/${parent.slug}">${esc(parent.keyword)}</a><span>›</span>` : ''}<span>${esc(k)}</span></nav>
<section class="hero kw-hero"><div><p class="eyebrow">${p.flag} ${esc(p.city)} · ${y}년 ${Number(m)}월 업데이트</p><h1>${esc(k)}<br><span>${esc(p.h1Sub)}</span></h1><p class="lead">${esc(p.lead)}</p><div class="hero-actions">${cta(p)}${gygUrl(p) ? `<a class="button kw-alt" href="${esc(gygUrl(p))}" target="_blank" rel="sponsored nofollow noopener">GetYourGuide에서 ${esc(p.city)} 투어 보기 →</a>` : ''}</div><p class="small kw-verified">공식 정보 확인일 ${esc(p.verified)}</p><button type="button" class="kw-share" id="kw-share" data-title="${esc(p.title)}"><svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M7 8l5-5 5 5M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/></svg><span>동행에게 공유하기</span></button></div>${figure(p, 'main')}</section>
<nav class="kw-toc" aria-label="목차">${toc.join('')}</nav>
<div class="grid"><article class="main-content">
${sections.join('\n')}
</article><aside><div class="aside-card"><strong>${esc(k)} 예약</strong><p>${esc(p.asideNote)}</p><a class="aside-link kw-aside-book" href="${esc(p.booking.url)}" target="_blank" rel="${p.affiliate === false ? 'nofollow noopener' : 'sponsored nofollow noopener'}">${esc(bookLabel(p))} →</a>${gygUrl(p) ? `<a class="aside-link" href="${esc(gygUrl(p))}" target="_blank" rel="sponsored nofollow noopener">GetYourGuide에서 ${esc(p.city)} 투어 보기 →</a>` : ''}${p.routeCheck ? `<a class="aside-link" href="${esc(p.routeCheck.url)}">정류장 지도 보기 →</a>` : `<a class="aside-link" href="#route">노선·정류장 보기 →</a>`}${SIM[p.slug] ? `<a class="aside-link" href="${SIM[p.slug].url}">하루 코스 시뮬레이터 →</a>` : ''}${asideRides}</div></aside></div>
</div></main><footer><div class="wrap"><a href="/">CITYTOURBUS.KR</a><p>전 세계 시티투어버스를 비교합니다. ${p.affiliate === false ? '예약 버튼은 운영사 공식 사이트로 연결되며, GetYourGuide 링크는 제휴 링크라 예약 시 수수료를 받을 수 있습니다.' : '이 페이지의 예약 링크는 제휴 링크라 예약 시 수수료를 받을 수 있으며, 이용자가 내는 금액은 같습니다.'}</p><p>문의·제휴 <a href="mailto:contact@citytourbus.kr">contact@citytourbus.kr</a></p><a href="/terms">이용약관</a> · <a href="/privacy">개인정보처리방침</a></div></footer>
<div class="kw-sticky" id="kw-sticky" hidden><div class="kw-sticky-txt"><b>${esc(k)}</b><small>${esc(p.tickets[0].price)}</small></div><a class="button kw-cta" href="${esc(p.booking.url)}" target="_blank" rel="${p.affiliate === false ? 'nofollow noopener' : 'sponsored nofollow noopener'}">${BRAND[p.operator] ? esc(BRAND[p.operator]) + ' 예약' : '예약하기'} →</a></div>
<script>(function(){var s=document.getElementById('kw-sticky'),h=document.querySelector('.hero-actions');if(!s||!h||!('IntersectionObserver' in window))return;new IntersectionObserver(function(e){var r=e[0],show=!r.isIntersecting&&r.boundingClientRect.top<0;s.hidden=!show;document.body.classList.toggle('has-sticky',show)}).observe(h)})();
(function(){var b=document.getElementById('kw-share');if(!b)return;b.addEventListener('click',function(){var u=location.origin+location.pathname,t=b.getAttribute('data-title');if(navigator.share){navigator.share({title:t,url:u}).catch(function(){})}else if(navigator.clipboard){navigator.clipboard.writeText(u).then(function(){var l=b.querySelector('span'),o=l.textContent;l.textContent='링크를 복사했어요';setTimeout(function(){l.textContent=o},1800)})}})})();</script>
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

// Korean-traveller popularity (domestic first, then Japan/Asia, then the big European and American cities). Drives
// the homepage list order and the related-cities block; anything not listed follows alphabetically.
const POPULAR = ['seoul-city-tour-bus', 'busan-city-tour-bus', 'jeju-city-tour-bus', 'gyeongju-city-tour-bus', 'incheon-city-tour-bus', 'daegu-city-tour-bus', 'yeosu-city-tour-bus', 'andong-city-tour-bus', 'paju-city-tour-bus',
  'osaka-city-tour-bus', 'tokyo-city-tour-bus', 'fukuoka-city-tour-bus', 'hong-kong-big-bus', 'bangkok-city-tour-bus', 'singapore-big-bus', 'ho-chi-minh-city-tour-bus', 'hanoi-city-tour-bus', 'phuket-city-tour-bus', 'pattaya-city-tour-bus', 'da-lat-city-tour-bus', 'hue-city-tour-bus', 'ha-long-city-tour-bus', 'sydney-big-bus',
  'paris-big-bus', 'london-big-bus', 'rome-big-bus', 'barcelona-city-tour-bus', 'madrid-city-tour-bus', 'lisbon-city-tour-bus', 'prague-city-tour-bus', 'vienna-big-bus', 'budapest-big-bus', 'amsterdam-city-tour-bus', 'berlin-city-tour-bus', 'munich-big-bus', 'edinburgh-city-tour-bus', 'dublin-city-tour-bus', 'athens-city-tour-bus', 'seville-city-tour-bus', 'porto-city-tour-bus', 'malaga-city-tour-bus', 'copenhagen-city-tour-bus', 'stockholm-city-tour-bus', 'oslo-city-tour-bus', 'helsinki-city-tour-bus', 'reykjavik-city-tour-bus', 'dubrovnik-city-tour-bus', 'split-city-tour-bus', 'warsaw-city-tour-bus', 'tallinn-city-tour-bus',
  'new-york-big-bus', 'los-angeles-city-tour-bus', 'san-francisco-big-bus', 'las-vegas-big-bus', 'chicago-big-bus', 'washington-dc-big-bus', 'miami-big-bus', 'toronto-city-tour-bus', 'seattle-city-tour-bus',
  'dubai-city-tour-bus', 'abu-dhabi-city-tour-bus', 'cape-town-city-tour-bus'];
const REGION = Object.fromEntries([
  ...'🇰🇷'.split(' ').map(f => [f, 'kr']),
  ...['🇯🇵', '🇭🇰', '🇸🇬', '🇹🇭', '🇻🇳', '🇦🇺'].map(f => [f, 'asia']),
  ...['🇺🇸', '🇨🇦', '🇨🇴', '🇵🇦'].map(f => [f, 'america']),
  ...['🇦🇪', '🇸🇦', '🇿🇦'].map(f => [f, 'mea']),
  ...['🇬🇧', '🇪🇸', '🇳🇴', '🇬🇷', '🇩🇪', '🇵🇹', '🇸🇪', '🇩🇰', '🇮🇪', '🇭🇷', '🇲🇹', '🇳🇱', '🇭🇺', '🇫🇮', '🇫🇷', '🇨🇿', '🇮🇸', '🇱🇻', '🇮🇹', '🇪🇪', '🇦🇹', '🇵🇱'].map(f => [f, 'europe'])
]);
const REGION_NAME = { kr: '국내 다른 도시', asia: '아시아·오세아니아 다른 도시', america: '미주 다른 도시', mea: '중동·아프리카 다른 도시', europe: '유럽 다른 도시' };
const SIM = Object.fromEntries(Object.entries(JSON.parse(fs.readFileSync('data/simulator/cities.json', 'utf8'))).map(([k, c]) => [c.slug, { url: `/${k}-bus-simulator`, label: `${c.ko} ${c.brand} 시뮬레이터` }]));
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
// pubDate is the page's last content update (Naver shows it as the post date in search results); the
// channel's lastBuildDate is the latest of those.
const rssItems = [
  ...pages.map(p => ({ title: p.title, link: `${SITE}/${p.slug}`, description: p.description, date: p.updated })),
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

// homepage: list every bus keyword page; rideCard pages (go-kart, rickshaw...) are linked from their city's bus page only (index.html is what "/" serves; keep index-v2.html in sync)
const homeRank = (p) => { const i = POPULAR.indexOf(p.parent || p.slug); return (i < 0 ? 999 : i) + (p.parent ? 0.5 : 0); };
const homeOrder = [...pages].sort((a, b) => homeRank(a) - homeRank(b) || a.slug.localeCompare(b.slug));
const homeLinks = homeOrder.filter(p => !p.rideCard).map(p => `<a href="/${p.slug}" style="display:block;background:#fff;border:1px solid #e5e5ea;border-radius:12px;padding:16px;text-decoration:none;font-size:14px;font-weight:700">${esc(p.keyword)} <span style="float:right;color:#e22b37">→</span></a>`).join('');
const homeBlock = `<div style="max-width:1180px;margin:28px auto 0"><h2 style="font-size:22px;letter-spacing:-.6px;margin:0 0 14px">도시별 시티투어버스 노선·가격 총정리</h2><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:10px">${homeLinks}</div></div>`;
for (const f of ['index.html', 'index-v2.html']) setBlock(f, 'kw-home', homeBlock, '</section><footer>');

fs.mkdirSync(path.join(ROOT, 'scripts/keyword-pages/.cache'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'scripts/keyword-pages/.cache/cards.json'), JSON.stringify(specs, null, 1));
console.log('pages:', pages.length, 'card specs:', specs.length);
