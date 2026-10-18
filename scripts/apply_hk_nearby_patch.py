from pathlib import Path

p = Path('hong-kong-route-prototype.html')
s = p.read_text()

css = '<link rel="stylesheet" href="/hk-nearby-place-search.css?v=20261018a">'
if css not in s:
    s = s.replace('</head>', css + '\n</head>', 1)

if 'id="placeFinderForm"' not in s:
    block = '''<div class="placefinder">
          <div class="placefinder-kicker">맛집 · 호텔 · 관광지 자유검색</div>
          <h2>내가 가려는 곳에서 가까운 정류장 찾기</h2>
          <p class="placefinder-lead">홍콩의 상호명이나 호텔·관광지를 검색하면 가장 가까운 Big Bus 정류장과 그 정류장을 지나는 노선을 보여드립니다.</p>
          <form class="placefinder-form" id="placeFinderForm">
            <input id="placeSearchInput" type="search" autocomplete="off" placeholder="예: 팀호완 홍콩역, 페닌슐라 홍콩">
            <button type="submit">정류장 찾기</button>
          </form>
          <div class="placefinder-status" id="placeSearchStatus">한글·영문 상호명 모두 검색할 수 있습니다.</div>
          <div class="placefinder-results" id="placeSearchResults"></div>
          <div id="nearestStopResult"></div>
        </div>
        <div class="side-divider"></div>'''
    s = s.replace('<aside class="side">', '<aside class="side">\n        ' + block, 1)

js = '<script src="/hk-nearby-place-search.js?v=20261018a"></script>'
if js not in s:
    s = s.replace('</body>', js + '\n</body>', 1)

p.write_text(s)
