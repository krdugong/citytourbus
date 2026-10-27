"""Writes data/route-maps/<slug>.json for keyword pages.
Stop order and names follow each page's stop list (data/keyword-pages). Coordinates come from the
route-checker data already in the repo where available, otherwise from OpenStreetMap Nominatim.
Usage (from repo root): python3 scripts/route-maps/make-data.py
"""
import json, os, re, subprocess, time, urllib.parse

ROOT = os.getcwd()
UA = 'citytourbus.kr route map builder (https://www.citytourbus.kr)'
CACHE = os.path.join(ROOT, 'scripts/route-maps/.cache/geocode.json')
geo_cache = json.load(open(CACHE)) if os.path.exists(CACHE) else {}


def route_check():
    src = open('route-check-data.js', encoding='utf-8').read()
    data = json.loads(src[src.index('{'):src.rindex('}') + 1])
    out = {}
    for city, v in data.items():
        for key, r in v['routes'].items():
            for s in r['stops']:
                out[(city, key, s['n'])] = (s['lat'], s['lng'])
                out.setdefault((city, s['n']), (s['lat'], s['lng']))  # numbers can repeat across routes
    # New York lives in its own route checker page
    h = open('new-york-route-check.html', encoding='utf-8').read()
    for n, lat, lng in re.findall(r"\{n:(\d+),[^{}]*?lat:([\d.-]+),lng:([\d.-]+)", h):
        out[('new-york', int(n))] = (float(lat), float(lng))
    return out


RC = route_check()


def geocode(q, bbox):
    if q not in geo_cache:
        url = 'https://nominatim.openstreetmap.org/search?' + urllib.parse.urlencode({'q': q, 'format': 'json', 'limit': 1})
        res = subprocess.run(['curl', '-s', '-A', UA, url], capture_output=True, text=True).stdout
        j = json.loads(res or '[]')
        geo_cache[q] = [float(j[0]['lat']), float(j[0]['lon'])] if j else None
        time.sleep(1.1)  # Nominatim usage policy: max 1 request per second
    p = geo_cache[q]
    if not p:
        raise SystemExit(f'not found: {q}')
    s, w, n, e = bbox
    if not (s <= p[0] <= n and w <= p[1] <= e):
        raise SystemExit(f'outside city box: {q} -> {p}')
    return p


def stops_from(city, nums, route=None):
    return [RC[(city, route, n)] if route else RC[(city, n)] for n in nums]


def write(slug, city, title, sub, routes):
    page = json.load(open(f'data/keyword-pages/{slug}.json', encoding='utf-8'))
    out_routes = []
    for (key, title_short, sub_r, color, coords), pr in zip(routes, page['routes']):
        names = pr['stops']
        assert len(names) == len(coords), (slug, key, len(names), len(coords))
        out_routes.append({'key': key, 'name': f"{title_short} · {pr.get('area') or ''}".strip(' ·'), 'title': title_short, 'sub': sub_r, 'color': color,
                           'stops': [{'name': n, 'lat': c[0], 'lng': c[1]} for n, c in zip(names, coords)]})
    json.dump({'city': city, 'slug': slug, 'title': title, 'sub': sub, 'routes': out_routes},
              open(f'data/route-maps/{slug}.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('wrote', slug, [len(r['stops']) for r in out_routes])


RED, BLUE, GREEN, YELLOW = '#e2252b', '#1f6fd1', '#1f9d55', '#eab308'

write('paris-big-bus', '파리', '파리 빅버스 노선도', '레드 노선 · 정류장 10곳 · 약 2시간 15분',
      [('red', '레드', '루브르 · 노트르담 · 에펠탑 · 샹젤리제 · 오페라', RED, stops_from('paris', range(1, 11)))])
write('rome-big-bus', '로마', '로마 빅버스 노선도', '레드 노선 · 공식 시간표 정류장 7곳 · 약 103분',
      [('red', '레드', '테르미니 · 바티칸 · 스페인 계단 · 베네치아 광장', RED, stops_from('rome', [1, 2, 4, 5, 6, 7, 8]))])
write('new-york-big-bus', '뉴욕', '뉴욕 빅버스 노선도', '다운타운 레드 · 업타운 블루 · 정류장 번호는 노선별 순서',
      [('red', '다운타운', '타임스스퀘어 · 소호 · 월스트리트 · 허드슨 야드', RED, stops_from('new-york', range(1, 14))),
       ('blue', '업타운', '록펠러 센터 · 메트로폴리탄 미술관 · 센트럴파크', BLUE, stops_from('new-york', [14, 2, 15, 16, 17, 18, 19]))])
write('london-big-bus', '런던', '런던 빅버스 노선도', '레드 · 블루 · 그린 주요 정류장 · 번호는 노선별 순서',
      [('red', '레드', '버킹엄 궁전 · 런던아이 · 세인트 폴 · 런던탑', RED, stops_from('london', [1, 4, 5, 6, 7, 10, 11, 13, 14, 15, 16, 18, 20, 23, 25])),
       ('blue', '블루', '하이드파크 · 켄싱턴 · 노팅힐 · 베이커 스트리트', BLUE, stops_from('london', [25, 30, 31, 32, 34, 35, 36, 39, 42, 43, 6, 11, 16, 23])),
       ('green', '그린', '킹스크로스 · 세인트 판크라스 · 대영박물관', GREEN, stops_from('london', [44, 45, 46, 47, 48, 50, 17, 13]))])
write('barcelona-city-tour-bus', '바르셀로나', '바르셀로나 시티투어버스 노선도', '레드라인 22곳 · 블루라인 14곳 · 번호는 노선별 순서',
      [('red', '레드라인', '몬주익 · 해변 · 사그라다 파밀리아', RED, stops_from('barcelona', [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 22, 21, 20, 19, 18, 17, 16, 15, 14, 13, 12], 'red')),
       ('blue', '블루라인', '카사 밀라 · 구엘 공원 · 캄프 누', BLUE, stops_from('barcelona', [1, 2, 3, 4, 5, 6, 7, 14, 13, 12, 11, 10, 9, 8], 'blue'))])

SYD = (-33.95, 151.15, -33.83, 151.30)
syd = lambda q: q if isinstance(q, list) else geocode(q + ', Sydney, Australia', SYD)
PHILLIP = [-33.8627, 151.2116]  # Stop 1 Phillip St near Alfred St, opposite the Justice & Police Museum
write('sydney-big-bus', '시드니', '시드니 빅버스 노선도', '레드라인 시티 투어 · 블루라인 본다이 투어',
      [('red', '레드라인', '오페라하우스 · 달링하버 · 하버브리지 · 서큘러 키', RED,
        [syd(q) for q in [PHILLIP, 'Sydney Opera House', "St Mary's Cathedral", 'Art Gallery of New South Wales', 'El Alamein Fountain', 'Woolloomooloo Wharf', 'Australian Museum', 'Central Station', 'Sydney Fish Market', 'International Convention Centre Sydney', 'Dixon Street', 'King Street Wharf', 'Barangaroo Reserve', [-33.8580, 151.2072],  # Harbour Bridge stop on the south (The Rocks) side
                                  'Overseas Passenger Terminal', 'Circular Quay']]),
       ('blue', '블루라인', '패딩턴 · 본다이 비치 · 더블 베이', BLUE,
        [syd(q) for q in [PHILLIP, 'Queen Victoria Building', 'Oxford Street Paddington', 'Centennial Park', 'Bondi Beach', 'North Bondi', 'Double Bay', 'Australian Museum', 'St James railway station']])])

SF = (37.70, -122.53, 37.86, -122.35)
sf = lambda q: q if isinstance(q, list) else geocode(q + ', San Francisco, California', SF)
GGB_SOUTH, GGB_NORTH = [37.8077, -122.4750], [37.8325, -122.4807]  # Golden Gate Bridge south / north vista points
write('san-francisco-big-bus', '샌프란시스코', '샌프란시스코 빅버스 노선도', '레드 데이 투어 · 옐로 페인티드 레이디스',
      [('red', '레드', '피셔맨스 워프 · 유니언 스퀘어 · 금문교 · 롬바드 스트리트', RED,
        [sf(q) for q in ['99 Jefferson Street', 'Ghirardelli Square', 'Washington Square', 'Embarcadero Center', 'Ferry Building', 'Union Square', 'Hilton San Francisco Union Square', 'San Francisco City Hall', 'Grace Cathedral', 'Chestnut Street & Fillmore Street', GGB_SOUTH, GGB_NORTH]]
        + [sf(q) for q in ['Palace of Fine Arts', 'Lombard Street & Fillmore Street', 'Lombard Street & Hyde Street', 'Pier 35', 'Pier 39']]),
       ('yellow', '옐로', '페인티드 레이디스 · 헤이트 애시버리 · 골든게이트 파크', YELLOW,
        [sf(q) for q in ['Union Square', 'Painted Ladies', 'Haight Street & Ashbury Street', 'Golden Gate Park', 'Dragon Gate']])])

json.dump(geo_cache, open(CACHE, 'w'), indent=1)
