#!/usr/bin/env python3
"""Pick the GetYourGuide ride products shown in each bus page's "함께 타볼 만한 탈것" block.

Input: a harvest file of GetYourGuide category pages, {city: {category_id: [{u, n, r, c, l}]}} where u is the
product path (/dubai-l173/...-t67792/), n the Korean title, r the rating and c the review count. GetYourGuide
blocks plain HTTP clients, so the harvest is read in a browser from each city's /ko-kr/<loc>/x-tc<id>/ page
(the ItemList JSON-LD on it). Output: data/keyword-pages/_ride-picks.json, read by build.mjs.

Rules: no bus / hop-on hop-off products (the bus is this site's own product), at least 4.3 stars and 50 reviews,
the most-reviewed product of each ride kind (from the title) first, at most 2 per kind, 4 per city.
Usage (repo root): python3 -I scripts/keyword-pages/ride_picks.py <harvest.json> [YYYY-MM-DD]
The input may also be a reviewed pick list ({city: [{id, u, n, r, c, k}]}), which is written out unchanged.
Always skim the result: day trips and tours from other towns slip through (2026-11-07 run: removed Crete,
Glasgow and Tallinn trips, and karts/safaris that duplicate this site's own ride pages).
"""
import datetime, json, re, sys

# The ride kind comes from the title, not the category: GetYourGuide fills an empty category with lookalikes
# (a flight-simulator attraction under helicopter tours, canal boats under duck tours). No keyword, no pick.
KIND_RX = [('kart', r'카트|kart'), ('duck', r'덕 ?투어|덕 ?보트|수륙양용|duck'), ('heli', r'헬리콥터|헬기|경비행기|helicopter'),
           ('balloon', r'열기구|balloon'), ('jetski', r'제트 ?스키|jet ?ski'), ('safari', r'사파리|safari|듄 ?배싱'),
           ('atv', r'쿼드|ATV|버기|buggy'), ('rickshaw', r'툭툭|인력거|페디캡|릭샤|tuk|rickshaw|pedicab'),
           ('gondola', r'곤돌라|gondola'), ('boat', r'크루즈|보트|요트|운하|페리|유람선|범보트|쾌속선|선셋 세일|cruise|boat|yacht|ferry')]
KINDS = {'kart': '고카트', 'duck': '수륙양용 덕투어', 'heli': '헬기 투어', 'balloon': '열기구', 'jetski': '제트스키', 'safari': '사막 사파리',
         'atv': 'ATV·버기', 'rickshaw': '인력거·툭툭', 'gondola': '곤돌라', 'boat': '보트·크루즈'}
SKIP = re.compile(r'버스|승하차|hop|bus|공항|라운지|transfer|교통편|스모크|흡연|smoke|420|파티|party|펍|pub|낚시|fishing|새해|new year|'
                  r'일일 투어|당일 여행|일일 여행|종일|출발:|에서 출발|해안 여행|크루즈 승객|선택 가능|선택 사항|옵션 포함|2일|1박|스튜디오|입장|폭포|밸리', re.I)
def kind_of(title):
    return next((k for k, rx in KIND_RX if re.search(rx, title, re.I)), None)
PER_CITY, PER_KIND, MIN_RATING, MIN_REVIEWS = 4, 2, 4.3, 50

harvest = json.load(open(sys.argv[1], encoding='utf-8'))
checked = sys.argv[2] if len(sys.argv) > 2 else datetime.date.today().isoformat()
out = {}
for city, cats in sorted(harvest.items()):
    if isinstance(cats, list):  # already picked and reviewed by hand ({city: [picks]}): keep as is
        out[city] = cats
        continue
    seen, pool = set(), []
    for items in cats.values():
        for it in items or []:
            m = re.search(r'-t(\d+)/?$', it.get('u') or '')
            if not m or not it.get('n') or SKIP.search(it['n']):
                continue
            k = kind_of(it['n'])
            if not k:
                continue
            if (it.get('r') or 0) < MIN_RATING or (it.get('c') or 0) < MIN_REVIEWS:
                continue
            if m.group(1) in seen:
                continue
            seen.add(m.group(1))
            pool.append({'id': m.group(1), 'u': it['u'], 'n': it['n'], 'r': round(it['r'], 1), 'c': it['c'], 'k': k})
    pool.sort(key=lambda x: -x['c'])
    picks, per = [], {}
    for x in [next(p for p in pool if p['k'] == k) for k in dict.fromkeys(p['k'] for p in pool)] + pool:
        if len(picks) >= PER_CITY:
            break
        if x in picks or per.get(x['k'], 0) >= PER_KIND:
            continue
        picks.append(x)
        per[x['k']] = per.get(x['k'], 0) + 1
    if picks:
        out[city] = sorted(picks, key=lambda x: -x['c'])
d = datetime.date.fromisoformat(checked)
json.dump({'checked': f'{d.year}년 {d.month}월 {d.day}일', 'kinds': KINDS, 'cities': out},
          open('data/keyword-pages/_ride-picks.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('cities with picks:', len(out), '| picks:', sum(len(v) for v in out.values()))
