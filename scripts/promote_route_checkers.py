from pathlib import Path
import json

ROOT = Path('.')


def add_head_meta(text, canonical, description, title):
    text = text.replace(text[text.find('<title>'):text.find('</title>') + 8], f'<title>{title}</title>', 1)
    meta = f'\n<meta name="description" content="{description}">\n<link rel="canonical" href="{canonical}">'
    if 'rel="canonical"' not in text:
        text = text.replace('</head>', meta + '\n</head>', 1)
    return text

# Promote prototype pages to stable user-facing route checker pages.
ny_src = ROOT / 'new-york-route-prototype.html'
hk_src = ROOT / 'hong-kong-route-prototype.html'
ny_dst = ROOT / 'new-york-route-check.html'
hk_dst = ROOT / 'hong-kong-route-check.html'

ny = ny_src.read_text()
ny = add_head_meta(
    ny,
    'https://www.citytourbus.kr/route-check/new-york',
    '뉴욕에서 가려는 관광지·맛집·호텔을 검색하고 가장 가까운 시티투어버스 정류장과 이용 가능한 노선을 확인하세요.',
    '뉴욕 시티투어버스 루트체커 | CITYTOURBUS',
)
ny = ny.replace('뉴욕 노선 · 내 일정 맞춤 찾기', '뉴욕 루트체커 · 내 일정 맞춤 찾기')
ny_dst.write_text(ny)

hk = hk_src.read_text()
hk = add_head_meta(
    hk,
    'https://www.citytourbus.kr/route-check/hong-kong',
    '홍콩에서 가려는 관광지·맛집·호텔을 검색하고 가장 가까운 시티투어버스 정류장과 이용 가능한 노선을 확인하세요.',
    '홍콩 시티투어버스 루트체커 | CITYTOURBUS',
)
hk = hk.replace('홍콩 빅버스 노선 지도', '홍콩 루트체커 · 내 일정 맞춤 찾기')
hk_dst.write_text(hk)

ny_src.unlink()
hk_src.unlink()

# Stable routes + redirects from the temporary prototype URLs.
vpath = ROOT / 'vercel.json'
vcfg = json.loads(vpath.read_text())
new_rewrites = [
    {"source": "/route-check/new-york", "destination": "/new-york-route-check.html"},
    {"source": "/route-check/hong-kong", "destination": "/hong-kong-route-check.html"},
]
existing_rewrites = vcfg.get('rewrites', [])
for item in reversed(new_rewrites):
    if not any(x.get('source') == item['source'] for x in existing_rewrites):
        existing_rewrites.insert(1, item)
vcfg['rewrites'] = existing_rewrites
redirects = vcfg.get('redirects', [])
for item in [
    {"source": "/new-york-route-prototype.html", "destination": "/route-check/new-york", "permanent": True},
    {"source": "/new-york-route-prototype", "destination": "/route-check/new-york", "permanent": True},
    {"source": "/hong-kong-route-prototype.html", "destination": "/route-check/hong-kong", "permanent": True},
    {"source": "/hong-kong-route-prototype", "destination": "/route-check/hong-kong", "permanent": True},
]:
    if not any(x.get('source') == item['source'] for x in redirects):
        redirects.append(item)
vcfg['redirects'] = redirects
vpath.write_text(json.dumps(vcfg, ensure_ascii=False, indent=2) + '\n')

# Homepage feature block. Keep both entry files byte-aligned.
css = '''
.routechecksec .sectionhd{align-items:center}.routecheck-available{flex:0 0 auto;display:inline-flex;align-items:center;gap:6px;border:1px solid var(--line);background:#fff;border-radius:999px;padding:7px 10px;font-size:10px;font-weight:700;color:var(--sub)}.routecheck-available:before{content:'';width:6px;height:6px;border-radius:50%;background:#20a464}.routecheck-cards{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;max-width:820px}.routecheck-card{text-decoration:none;border:1px solid var(--line);border-radius:20px;padding:21px 22px;background:#fff;display:flex;align-items:center;justify-content:space-between;gap:20px;transition:.16s}.routecheck-card:hover{transform:translateY(-2px);border-color:#bfc0c5;box-shadow:0 12px 30px rgba(0,0,0,.055)}.routecheck-card .city{font-size:18px;font-weight:800;letter-spacing:-.6px}.routecheck-card p{font-size:11px;line-height:1.7;color:var(--muted);margin-top:5px;word-break:keep-all}.routecheck-card .routego{flex:0 0 auto;font-size:11px;font-weight:800;color:var(--accent);white-space:nowrap}.routecheck-note{font-size:10px;color:var(--muted);margin-top:12px}@media(max-width:720px){.routechecksec .sectionhd{align-items:flex-start}.routecheck-available{margin-top:10px}.routecheck-cards{grid-template-columns:1fr}.routecheck-card{padding:18px}.routecheck-card .city{font-size:16px}}
'''
block = '''<section class="section routechecksec" id="route-check"><div class="sectionhd"><div><h2>가려는 곳이 시티투어버스 루트에 있는지 체크해보세요</h2><p>관광지·맛집·호텔을 검색하면 가까운 정류장과 이용 가능한 노선을 보여드립니다.</p></div><span class="routecheck-available">현재 가능한 도시</span></div><div class="routecheck-cards"><a class="routecheck-card" href="/route-check/new-york"><div><div class="city">뉴욕</div><p>타임스퀘어부터 맛집·호텔까지, 내 일정에서 가까운 Big Bus 정류장을 찾아보세요.</p></div><span class="routego">루트 체크하기 →</span></a><a class="routecheck-card" href="/route-check/hong-kong"><div><div class="city">홍콩</div><p>홍콩섬·스탠리·구룡 노선 중 내가 가려는 장소와 가까운 정류장을 찾아보세요.</p></div><span class="routego">루트 체크하기 →</span></a></div><div class="routecheck-note">현재 뉴욕·홍콩에서 사용할 수 있으며 지원 도시는 순차적으로 확대할 예정입니다.</div></section>'''
marker = '<section class="section quizsec" id="quiz">'
for fname in ['index.html', 'index-v2.html']:
    p = ROOT / fname
    s = p.read_text()
    if '.routechecksec .sectionhd' not in s:
        s = s.replace('</style>', css + '</style>', 1)
    if 'id="route-check"' not in s:
        if marker not in s:
            raise RuntimeError(f'Homepage insertion marker missing in {fname}')
        s = s.replace(marker, block + '\n' + marker, 1)
    p.write_text(s)

# Sitemap additions.
spath = ROOT / 'sitemap.xml'
s = spath.read_text()
entries = [
    '  <url><loc>https://www.citytourbus.kr/route-check/new-york</loc><lastmod>2026-10-18</lastmod><changefreq>weekly</changefreq><priority>0.9</priority></url>',
    '  <url><loc>https://www.citytourbus.kr/route-check/hong-kong</loc><lastmod>2026-10-18</lastmod><changefreq>weekly</changefreq><priority>0.9</priority></url>',
]
for entry in entries:
    loc = entry.split('<loc>')[1].split('</loc>')[0]
    if loc not in s:
        s = s.replace('</urlset>', entry + '\n</urlset>')
spath.write_text(s)
