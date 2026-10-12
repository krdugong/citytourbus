from pathlib import Path

p = Path('index-v2.html')
s = p.read_text(encoding='utf-8')

replacements = {
    '<div class="note"><b>City Sightseeing 할인:</b> CJTRAVEL10 10% 프로모션 코드는 대상 링크·상품의 예약 단계에서 적용 여부를 확인하세요. 가격과 운영 조건은 수시로 바뀔 수 있습니다.</div>': '<div class="note"><b>CITYTOURBUS 전용 혜택:</b> City Sightseeing 대상 상품은 <strong>CJTRAVEL10</strong> 코드로 10% 할인받을 수 있습니다. 제휴 링크를 통해 들어가 예약 단계에서 적용 여부를 확인하세요.</div>',
    '<h2>도시만 정하면 비교는 간단합니다</h2><p>브랜드를 몰라도 사용할 수 있게 구성했습니다.</p>': '<h2>도시만 정하면 혜택까지 한눈에</h2><p>브랜드를 몰라도 가격과 할인부터 바로 비교할 수 있습니다.</p>',
    '<div class="value"><em>02</em><h3>운영사·가격 비교</h3><p>같은 도시에서 이용할 수 있는 시티투어버스와 현재 확인 가능한 가격·할인 조건을 함께 봅니다.</p></div>': '<div class="value"><em>02</em><h3>가격·프로모션 비교</h3><p>같은 도시에서 이용할 수 있는 시티투어버스의 현재 가격과 온라인 프로모션을 한 화면에서 비교합니다.</p></div>',
    '<div class="value"><em>03</em><h3>예약 페이지 이동</h3><p>조건을 확인한 뒤 원하는 운영사나 예약 플랫폼의 페이지로 이동해 최종 조건을 확인하고 예약합니다.</p></div>': '<div class="value"><em>03</em><h3>단독 10% 할인코드</h3><p>City Sightseeing 대상 상품은 CJTRAVEL10 코드로 10% 할인받을 수 있습니다. 적용 가능 여부는 예약 단계에서 확인하세요.</p></div>',
    '<small>CJTRAVEL10 대상 상품은 예약 단계에서 적용 여부 확인</small>': '<small>CITYTOURBUS 전용 코드 CJTRAVEL10 · 대상 상품 10% 할인</small>',
}

for old, new in replacements.items():
    if old not in s:
        raise SystemExit(f'Missing expected text: {old[:80]}')
    s = s.replace(old, new, 1)

p.write_text(s, encoding='utf-8')
print('Updated customer-facing homepage copy')
