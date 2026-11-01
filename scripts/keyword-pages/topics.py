#!/usr/bin/env python3
"""Build the `topics` list on each keyword page JSON (rendered by build.mjs as "궁금한 점별 정리"):
  1. Naver autocomplete phrases for the page (data/keyword-pages/_autocomplete.json, from autocomplete.py) —
     the H3 contains the phrase verbatim ("바르셀로나 시티투어버스 한국어 오디오 가이드"), one per suffix.
  2. Then the Naver-optimised blog titles (data/keyword-pages/_topic-titles.json), one per intent first.
Each gets a 2-3 sentence answer built only from the page's own facts, plus a link to the detailed section.
Usage (repo root): python3 scripts/keyword-pages/topics.py
"""
import json, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA = os.path.join(ROOT, 'data/keyword-pages')
MAX_TOPICS, MAX_AC = 12, 9
titles = json.load(open(os.path.join(DATA, '_topic-titles.json')))
AC = json.load(open(os.path.join(DATA, '_autocomplete.json')))
SIM = {c['slug']: f"/{k}-bus-simulator" for k, c in json.load(open(os.path.join(ROOT, 'data/simulator/cities.json'))).items()}

INTENTS = [
  ('night', r'나이트|야경|야간|이브닝'),
  ('cruise', r'크루즈|기항지|승선|항구 복귀'),
  ('compare', r'탑뷰|비교|브랜드|무엇이 다를|고르기|어떤 걸|차이|어떤 버스'),
  ('mobile', r'모바일|앱|e티켓|휴대폰|바우처'),
  ('pass', r'하루권|이용권|티켓 종류|티켓 구성|포함 서비스|1일권|티켓 조건|유효시간|유효기간|가격 얼마|티켓 휴대폰|24시간|티켓'),
  ('booking', r'예약|예매|공홈|공식|가격|온라인|할인|OTA|취소'),
  ('route', r'노선|정류장|노선도|어디서 탈|타는 곳|탑승 위치|배차|첫차|막차|라인|환승|갈아타|어디서 타|루트|코스'),
  ('season', r'겨울|크리스마스|연말|성수기|시즌'),
  ('itinerary', r'일정|동선|하루|첫날|초행|처음|명소|자유여행|부모님|도보|걷는'),
]
def intent(t):
  for name, rx in INTENTS:
    if re.search(rx, t): return name
  return 'general'

# autocomplete suffix → (H3 tail, answer kind)
SUFFIX = [
  (r'예약 ?없이|예매 ?없이|현장 ?예약|당일 ?구매|당일 ?예약', ' 탈 수 있나요?', 'onsite'),
  (r'현장구매|현장 구매|현장 판매', ' 가능한 곳과 가격', 'onsite'),
  (r'추천', ' 기준', 'itinerary'),
  (r'한국어|한글', ' 오디오 가이드 여부', 'korean'),
  (r'(레드|블루|그린|옐로|오렌지|퍼플|핑크)\s?(라인|노선)?$|^(레드|블루|그린|옐로)$', ' 정류장과 운행 시간', 'line'),
  (r'노선도', ' 보는 법', 'route'),
  (r'시간표|시간$|투어 시간|운행시간|운영시간|첫차|막차', ' (첫차·막차)', 'time'),
  (r'정류장|탑승장|타는 곳|타는곳|출발', ' 위치', 'stop'),
  (r'후기|리뷰', ' 보기 전에 확인할 것', 'review'),
  (r'타는법|타는 법|이용방법|이용 방법|타는방법|타는 방법|이용법', ' 3단계', 'mobile'),
  (r'예약 방법|예약방법', ' 순서', 'booking'),
  (r'예약|예매', ' 순서', 'booking'),
  (r'가격|요금|비용|얼마', ' 정리', 'pass'),
  (r'티켓|이용권|24시간|48시간|1일권|2일권', ' 종류', 'pass'),
  (r'나이트|야경|야간|이브닝', ' 운영 정보', 'night'),
  (r'탑뷰|비교|차이', ' 포인트', 'compare'),
  (r'노선|루트|코스', ' 한눈에 보기', 'route'),
  (r'할인|쿠폰|프로모션', ' 적용 방법', 'booking'),
  (r'투어$|시티투어$', ' 한 줄 요약', 'general'),
  (r'지도|맵', ' 보는 법', 'route'),
]

def strip_paren(s): return re.sub(r'\s*\(.*?\)', '', s or '')

def sentence_with(p, word, maxlen=150):
  blob = json.dumps(p, ensure_ascii=False)
  for m in re.finditer(r'[^"\\.。]*' + word + r'[^"\\.。]*[.。]?', blob):
    s = m.group(0).strip()
    if 10 < len(s) <= maxlen and '\\n' not in s and 'http' not in s: return s.rstrip('.。') + '.'
  return None

def facts(p):
  r = p['routes']; r0 = r[0]
  f = {
    'k': p['keyword'], 'city': p['city'], 'n': len(r), 'routes': r,
    'rnames': '·'.join(strip_paren(x['name']) for x in r),
    'dur': r0.get('duration', ''), 'iv': r0.get('interval', ''), 'hours': r0.get('hours', ''),
    'stop0': (r0.get('stops') or [''])[0], 'stops3': ' → '.join((r0.get('stops') or [])[:4]),
    'nstops': sum(len(x.get('stops') or []) for x in r),
    'bigbus': p.get('operator') == 'bigbus' or p['keyword'].endswith('빅버스'),
    'sim': SIM.get(p['slug']), 'official': bool(p.get('official')),
    'onsite': p.get('onsite'), 'night': p.get('night'), 'extra_time': next((x for x in (p.get('extra') or []) if x.get('id') == 'time'), None),
    'ride': p.get('howToRide') or [],
  }
  dur = re.sub(r'^한 바퀴\s*', '', f['dur'])
  f['loop'] = f"한 바퀴 {dur}" if re.search(r'분|시간', dur) else None
  f['loopp'] = f"({dur})" if f['loop'] else ''
  def tk(x):
    base = x['name'] if x['validity'] in x['name'] else f"{x['name']}({x['validity']})"
    return base + (' ' + x['price'] if re.search(r'\d', x['price']) else ' (가격은 날짜 선택 후 표시)')
  t = p['tickets']; t0 = t[0]
  f['t0'] = tk(t0)
  f['t0b'] = f['t0'] if (f['t0'].endswith('부터') or f['t0'].endswith(')')) else f['t0'] + '부터'
  f['tlist'] = ', '.join(f"{x['name']} {x['validity']}" for x in t[:4]); f['tn'] = len(t)
  f['tdesc'] = f"{f['tlist']} 등 {f['tn']}종" if f['tn'] > 1 else f"{f['tlist']} 한 종류"
  long = [x for x in t if re.search(r'48|72|2일|3일', x.get('validity', ''))]
  f['tlong'] = tk(long[0]) if long else None
  f['cancel'] = sentence_with(p, '취소')
  f['korean'] = next((q['a'] for q in p.get('faq', []) if '한국어' in q['q'] or '한국어' in q['a']), None) or sentence_with(p, '한국어')
  if f['korean'] and '?' in f['korean']: f['korean'] = None
  f['lang'] = next((inc for x in t for inc in x.get('includes', []) if '언어' in inc or '가이드' in inc), None)
  f['port'] = next((s for x in r for s in (x.get('stops') or []) if re.search(r'항|터미널|부두|페리|크루즈|Port|Cruise', s)), None)
  f['app'] = 'Big Bus Tours 앱의 티켓' if f['bigbus'] else '예약 후 받는 모바일 바우처(QR)'
  summ = dict(p.get('summary') or [])
  f['buy'] = summ.get('구매') or summ.get('현장구매') or summ.get('판매')
  return f

def T(v, i): return v[i % len(v)]

def answer(kind, f, i, term=None):
  k = f['k']
  simlink = f" 가고 싶은 곳을 넣으면 탈 노선과 내릴 정류장을 순서대로 짜 주는 <a href=\"{f['sim']}\">3D 시뮬레이터</a>로 미리 돌려볼 수 있습니다." if f['sim'] else ''
  cancel = f" 취소 조건은 {f['cancel']}" if f['cancel'] else ''
  routeline = (f"{k}는 {f['rnames']} {f['n']}개 노선으로" if f['n'] > 1 else f"{k}는 노선 하나로") + f" {f['hours']} 운행하고 {f['iv']}으로 다닙니다."
  loop = f['loop']
  if kind == 'onsite':
    if f['onsite']: return f['onsite']['text'], 'onsite'
    if f['buy']: return f"{k} 구매처는 {f['buy']}입니다. 현장에서는 보통 정가이고 온라인이 더 저렴하며({f['t0b']}), 온라인 예약은 날짜를 고르면 바로 끝납니다.", 'booking'
    return f"{k}는 온라인 예약이 기본이고 가장 저렴한 티켓은 {f['t0']}입니다. 현장구매 가능 여부와 정가는 당일 운행 안내에 따라 달라지니, 출발 전에 온라인으로 사 두는 편이 안전합니다.", 'booking'
  if kind == 'korean':
    if f['korean']: return f['korean'] + ' 언어 목록은 바뀔 수 있으니 예약 화면의 안내에서 한국어가 있는지 확인하세요.', 'ride'
    lang = f" 티켓에는 ‘{f['lang']}’가 포함됩니다." if f['lang'] else ''
    return f"{k}의 오디오 가이드 언어 목록에 한국어가 있는지는 예약 화면의 상품 안내(Audio guide / Languages)에서 확인할 수 있습니다.{lang} 한국어가 없더라도 정류장 안내와 지도는 앱·바우처에서 볼 수 있어 이용에는 지장이 없습니다.", 'ride'
  if kind == 'line':
    colour = re.search(r'레드|블루|그린|옐로|오렌지|퍼플|핑크', term or '')
    r = next((x for x in f['routes'] if colour and colour.group(0) in x['name']), None)
    if r:
      stops = r.get('stops') or []
      d = re.sub(r'^한 바퀴\s*', '', r.get('duration', '')); d = f", 한 바퀴 {d}" if re.search(r'분|시간', d) else ''
      return f"{k} {strip_paren(r['name'])}은 {r.get('area', '')} 노선으로 {r.get('hours', '')} 운행, {r.get('interval', '')}{d}입니다. 정류장은 {len(stops)}곳이고 {' → '.join(stops[:4])} 순으로 돕니다.{simlink}", 'route'
    return routeline + simlink, 'route'
  if kind == 'time':
    if f['extra_time'] and f['extra_time'].get('table'):
      rows = f['extra_time']['table'][:3]
      return f"{k} 운행 시간은 정류장마다 다릅니다. " + ', '.join(f"{a} {b}" for a, b in rows) + " 순이며, 전체 정류장별 첫차·막차는 아래 시간표에서 볼 수 있습니다.", 'time'
    return ' · '.join(f"{strip_paren(x['name'])} {x.get('hours', '')} ({x.get('interval', '')})" for x in f['routes']) + (f". {loop}이므로 막차 시간에서 한 바퀴를 뺀 시각이 마지막으로 멀리 갈 수 있는 시간입니다." if loop else ". 막차 시간에 맞춰 돌아올 정류장을 먼저 정해 두세요."), 'route'
  if kind == 'stop':
    return f"{k} 첫 정류장은 {f['stop0']}이고 어느 정류장에서 타도 같은 순서로 돕니다. 정류장은 모두 {f['nstops']}곳, 순서는 {f['stops3']} 순입니다.{simlink}", 'route'
  if kind == 'review':
    return f"후기를 볼 때는 글이 쓰인 시점의 노선·운영시간이 지금과 다를 수 있다는 점만 주의하세요. 현재 기준 {routeline} 티켓은 {f['t0b']}입니다.", 'summary'
  if kind == 'night':
    n = f['night']
    if n:
      return T([
        f"{k} 야간 상품: 출발 {n['time']} · 소요 {n['duration']} · 가격 {n['price']}. 출발 장소: {n['start']}. 낮 승하차권과 포함 범위가 다르니 예약 화면에서 포함 여부를 먼저 확인하세요.",
        f"소요 {n['duration']}, 가격 {n['price']}, 출발 {n['time']}. 출발 장소: {n['start']}. 날짜별 운영 여부는 예약 화면에서 당일 기준으로 다시 확인하는 것이 안전합니다.",
      ], i), 'night'
    return f"현재 {k} 공식 정보에는 별도의 야간 투어 상품이 없습니다. 운행은 {f['hours']}까지이므로 야경을 보려면 막차 시간에 맞춰 마지막 정류장 근처 명소를 일정 끝에 두는 방법이 현실적입니다.", 'route'
  if kind == 'cruise':
    port = f" 항구 쪽 정류장은 ‘{f['port']}’입니다." if f['port'] else f" 첫 정류장은 {f['stop0']}입니다."
    return T([
      f"{(loop + ', ') if loop else ''}{f['iv']} 배차라서 승선 마감 2시간 전에는 마지막 탑승을 끝내는 것이 안전합니다.{port} 기항 당일 운행 여부는 날짜를 고르면 예약 화면에 바로 표시됩니다.",
      f"기항지에서는 돌아오는 시간이 전부입니다. {routeline} 내리는 곳을 두 곳 이내로 잡고, 복귀 정류장을 먼저 정해 두세요.{port}",
    ], i), 'route'
  if kind == 'compare':
    return T([
      f"이 페이지는 {k} 기준입니다. 다른 회사 버스와 비교할 때는 노선 수({f['n']}개), 티켓 유효시간, 야간투어 포함 여부, 취소 조건 네 가지를 같은 날짜·같은 인원으로 맞춰 보세요. 가장 저렴한 티켓은 {f['t0']}입니다.",
      f"브랜드보다 먼저 볼 것은 내 일정에 맞는 정류장이 있는지입니다. {k}는 {f['rnames']}으로 정류장 {f['nstops']}곳을 돌고, 티켓은 {f['tdesc']}입니다. 같은 조건으로 가격을 나란히 놓고 고르세요.",
    ], i), 'price'
  if kind == 'mobile':
    steps = f['ride'][:3]
    if steps and i == 0: return ' '.join(steps) , 'ride'
    return T([
      f"{k}는 {f['app']}을 기사에게 보여주면 탑승할 수 있고 종이 티켓은 필요 없습니다. 유효시간은 첫 탑승(활성화) 시점부터 계산되니 타기 직전에 열어 두고, 정류장 위치는 노선 목록에서 미리 확인하세요.",
      f"현지에서 헤매지 않으려면 출발 전에 {f['app']}을 열어 두고 첫 정류장({f['stop0']})까지 가는 길을 확인해 두세요. 배차는 {f['iv']}이라 한 대 놓쳐도 큰 손해는 없습니다.",
    ], i), 'ride'
  if kind == 'pass':
    lng = f" 이틀에 나눠 보려면 {f['tlong']} 티켓을 고르세요." if f['tlong'] else ''
    return T([
      f"{k} 티켓은 {f['tdesc']}이고 가장 저렴한 것은 {f['t0']}입니다.{lng} 하루에 내릴 곳이 3곳 이하라면 가장 짧은 티켓으로 충분하고, 그 이상이면 유효시간이 긴 티켓이 낫습니다.",
      f"하루권이 맞는지는 탑승 횟수보다 내릴 정류장 수로 정하세요. {(loop + '이므로 ') if loop else ''}3~4곳에서 내리면 하루가 꽉 찹니다. 티켓은 {f['t0b']} 시작합니다.{lng}",
    ], i), 'price'
  if kind == 'booking':
    where = '공식 홈페이지' if f['official'] else '예약 페이지'
    return T([
      f"{k} 예약은 날짜와 인원을 고르면 바로 끝나고, 가장 저렴한 티켓은 {f['t0']}입니다. 다른 판매처와 비교할 때는 같은 날짜·같은 티켓 종류로 맞춘 뒤 가격을 보세요.{cancel}",
      f"현장에서 사면 보통 정가이고 온라인이 더 저렴합니다. {k} 온라인 가격은 {f['t0b']}이며, 결제 전에 티켓 유효시간과 포함 내용을 {where}에서 한 번 더 확인하세요.{cancel}",
      f"예약 전에 볼 것은 세 가지입니다. 첫 탑승 날짜(유효시간이 그때부터 계산), 티켓 종류({f['tlist']}), 그리고 취소 조건입니다.{cancel or ' 취소 조건은 예약 화면 하단에 표시됩니다.'}",
    ], i), 'booking'
  if kind == 'route':
    return T([
      f"{routeline} 처음 타기 좋은 곳은 첫 정류장인 {f['stop0']}이고, 순서는 {f['stops3']} 순입니다.{simlink}",
      f"정류장은 모두 {f['nstops']}곳{(', ' + loop) if loop else ''}입니다. 노선도를 보기 전에 내가 갈 명소와 가장 가까운 정류장 2~3곳만 고르면 하루 동선이 정리됩니다. 운행 {f['hours']}, {f['iv']}.{simlink}",
    ], i), 'route'
  if kind == 'season':
    return T([
      f"{k}는 {f['hours']} 운행합니다. 겨울에는 해가 짧아 첫차에 맞춰 시작하는 편이 좋고, 연말·성수기에는 운영시간과 노선이 바뀔 수 있으니 출발 전날 예약 화면에서 당일 운행 정보를 다시 확인하세요.",
      f"시즌에 따라 배차와 막차가 달라집니다. 기준 정보는 {f['hours']}, {f['iv']}이며, 크리스마스·연말에는 일부 날짜가 휴무이거나 단축 운행할 수 있으니 날짜를 고른 뒤 표시되는 운행 안내를 기준으로 삼으세요.",
    ], i), 'route'
  if kind == 'itinerary':
    return T([
      f"첫날 오전에 {f['stop0']}에서 타고 한 바퀴{f['loopp']} 돌며 도시를 익힌 뒤, 오후에 가고 싶은 정류장 2~3곳에서 내리는 순서가 가장 무난합니다.{simlink}",
      f"걷는 동선을 줄이려면 명소를 정류장 순서대로 배치하세요. {k} 첫 구간은 {f['stops3']} 순이고, 배차 {f['iv']}이라 한 곳에서 1시간쯤 보내고 다음 버스를 타면 됩니다.{simlink}",
      f"하루 코스는 ‘타는 정류장 1곳 + 내리는 정류장 3곳’으로 잡으면 {(loop + ' 안에 ') if loop else '하루 안에 '}끝납니다. 부모님과 함께라면 오르막이 많은 명소를 버스 정류장 바로 앞 명소로 바꾸는 것이 편합니다.",
    ], i), 'route'
  return T([
    f"{routeline} 티켓은 {f['t0b']}이고, 정류장 {f['nstops']}곳 중 내가 갈 명소와 가까운 곳만 골라 타고 내리면 됩니다.",
    f"처음이라면 첫 정류장 {f['stop0']}에서 시작해 한 바퀴{f['loopp']} 돌아보세요. 티켓은 {f['tdesc']}이고 유효시간은 첫 탑승부터 계산됩니다.",
  ], i), 'summary'

ANCHOR_LABEL = {'route': '노선·정류장 보기', 'price': '가격·티켓 보기', 'booking': '예약 방법 보기', 'night': '나이트 투어 보기', 'ride': '타는법 보기', 'summary': '한눈에 보기', 'onsite': '현장구매 보기', 'time': '시간표 보기'}

def ac_items(p, slug):
  """Autocomplete phrases for this page → (h3, kind, term), deduped by suffix."""
  k, city = p['keyword'], p['city']
  seen, out = set(), []
  for seed, sugg in (AC.get(slug) or {}).items():
    for s in sugg:
      s = s.strip()
      if not s.startswith(city) or s.replace(' ', '') == seed.replace(' ', ''): continue
      # suffix after the brand words
      suf = re.sub(r'^.*?(시티투어\s?버스|빅버스\s?투어|빅버스|시티투어|2층버스|홉온홉오프)\s*', '', s).strip()
      if not suf or suf in ('투어', '시티투어', '버스'): continue
      key = re.sub(r'방법|순서|정리|하는법|하는 법', '', re.sub(r'\s', '', suf))
      if not key or key in seen: continue
      for rx, tail, kind in SUFFIX:
        if re.search(rx, suf):
          dk = kind if kind in ('night', 'onsite', 'korean', 'time', 'stop', 'review', 'compare', 'mobile', 'itinerary') else key
          if dk in seen: break
          seen.add(key); seen.add(dk); out.append((s + tail, kind, suf)); break
  return out[:MAX_AC]

def pick_titles(items, have, budget):
  seen, out, rest = set(have), [], []
  for it in items:
    kd = intent(it['t'])
    (out if kd not in seen else rest).append((it['t'], kd)); seen.add(kd)
  return (out + rest)[:max(0, budget)]

changed = 0
for f in sorted(os.listdir(DATA)):
  if not f.endswith('.json') or f.startswith('_'): continue
  slug = f[:-5]; path = os.path.join(DATA, f)
  p = json.load(open(path)); p.setdefault('slug', slug)
  fx = facts({**p, 'topics': []})  # never read our own generated text back as a fact
  counts = {}; topics = []; counts = {}; topics = []
  def push(h3, kd, term=None):
    i = counts.get(kd, 0); counts[kd] = i + 1
    a, anchor = answer(kd, fx, i, term)
    if anchor == 'night' and not p.get('night'): anchor = 'route'
    if anchor == 'onsite' and not p.get('onsite'): anchor = 'booking'
    if anchor == 'time' and not fx['extra_time']: anchor = 'route'
    topics.append({'h3': h3, 'a': a, 'anchor': anchor, 'label': ANCHOR_LABEL[anchor]})
  for h3, kd, term in ac_items(p, slug): push(h3, kd, term)
  for t, kd in pick_titles(titles.get(slug, []), counts.keys(), MAX_TOPICS - len(topics)): push(t, kd)
  if topics:
    p['topics'] = topics; changed += 1
  elif 'topics' in p:
    del p['topics']
  json.dump(p, open(path, 'w'), ensure_ascii=False, indent=1)
print('pages with topics:', changed)
