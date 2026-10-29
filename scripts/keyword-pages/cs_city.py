"""Helper for writing City Sightseeing city pages into data/keyword-pages/<slug>.json.
Fills the shared parts (booking steps, CJTRAVEL10 note, card images, summary rows) so each city only
supplies facts read from its official City Sightseeing pages. Import from a one-off script:
    from cs_city import cs_page
"""
import json, os

ROOT = os.getcwd()
DEFAULT_DATE = '2026-10-28'


def cs_page(*, slug, keyword, city, flag, cs_url, sid, lead, title, description, operator_note,
            summary, routes, tickets, faq, start_stop, ride_extra=None, night=None, extra=None, h2=None,
            hours_note='', vouchers='구매 후 12개월 안에 사용', languages=None, aside=None, date=DEFAULT_DATE,
            cj_verified=False, image_sub=None, short=None):
    short = short or city
    booking = {'url': f'https://www.jdoqocy.com/click-8754229-15734727?sid={sid}&url={cs_url}', 'label': f'{keyword} 예약하기'}
    cj = ('결제 화면 할인코드 칸에 CJTRAVEL10을 입력하면 할인가에서 10%가 추가로 빠집니다.' if cj_verified else
          f'City Sightseeing 결제 화면에서 CJTRAVEL10 코드를 입력해 보세요. CITYTOURBUS 전용 10% 코드이지만, {city}에서 적용되는지는 아직 결제 화면으로 확인하지 못했으니 최종 금액을 꼭 확인하세요.')
    how_to_book = [f'아래 예약 버튼으로 City Sightseeing {city} 예약 페이지에 들어갑니다.',
                   f'티켓 종류와 날짜, 인원을 고릅니다. 바우처는 {vouchers}할 수 있습니다.', cj,
                   '결제 후 받은 모바일 바우처를 휴대폰에 저장합니다. 탑승 24시간 전까지 무료 취소됩니다.']
    how_to_ride = [f'출발 정류장은 {start_stop}입니다. 다른 정류장에서 타도 됩니다.',
                   '버스에 오를 때 휴대폰의 모바일 바우처를 직원이나 기사에게 보여줍니다.',
                   f"버스 안에서 {languages + ' ' if languages else ''}오디오 가이드를 들으며 이동합니다.".replace('  ', ' '),
                   '원하는 정류장에서 내렸다가 다음 버스를 다시 타면 됩니다.'] + (ride_extra or [])
    sub = image_sub or {}
    images = {
        'main': {'alt': f'{keyword} 노선 가격 예약 총정리', 'eyebrow': '2026년 10월 업데이트', 'title': f'{short}\n시티투어버스', 'sub': sub.get('main', '노선 · 가격 · 예약 · 타는법'), 'bg': '#e22b37'},
        'routes': {'alt': f'{keyword} 노선 정류장', 'eyebrow': 'ROUTE', 'title': f'{short}\n투어버스 노선', 'sub': sub.get('routes', ''), 'bg': '#1d1d1f'},
        'price': {'alt': f'{keyword} 가격 티켓', 'eyebrow': 'TICKET', 'title': f'{short}\n투어버스 가격', 'sub': sub.get('price', ''), 'bg': '#f2a516'},
        'booking': {'alt': f'{keyword} 예약 방법', 'eyebrow': 'BOOKING', 'title': f'{short}\n투어버스 예약', 'sub': '모바일 바우처 · 24시간 전 무료 취소', 'bg': '#1f9d55'},
        'ride': {'alt': f'{keyword} 타는법', 'eyebrow': 'HOW TO RIDE', 'title': f'{short}\n투어버스 타는법', 'sub': '바우처 보여주고 탑승 · 자유 승하차', 'bg': '#1f6fd1'},
    }
    if night:
        images['night'] = {'alt': f'{keyword} 야간 투어 야경', 'eyebrow': 'NIGHT TOUR', 'title': f'{short}\n야간 투어', 'sub': sub.get('night', ''), 'bg': '#1b2350'}
    for x in extra or []:
        if x.get('image') and x['image'] not in images:
            images[x['image']] = {'alt': x.get('alt', x['h2']), 'eyebrow': x['label'], 'title': f"{short}\n{x.get('card', x['toc'])}", 'sub': x.get('card_sub', ''), 'bg': '#0f766e'}
    # a rewrite of an existing page keeps the day its URL first went live
    fp = os.path.join(ROOT, 'data/keyword-pages', f'{slug}.json')
    published = json.load(open(fp, encoding='utf-8')).get('published', date) if os.path.exists(fp) else date
    d = {
        'slug': slug, 'keyword': keyword, 'city': city, 'flag': flag, 'operator': 'city-sightseeing',
        'published': published, 'updated': date, 'verified': date, 'title': title, 'description': description,
        'h1Sub': '노선·가격·예약 총정리', 'lead': lead, 'booking': booking, 'official': cs_url,
        'summary': [['운영', operator_note]] + summary,
        'routes': routes, 'tickets': tickets,
        'priceNote': f'가격은 {date[:4]}년 {int(date[5:7])}월 {int(date[8:])}일 City Sightseeing 공식 사이트의 성인 기준 최저가(from, 유로 표시)입니다. 날짜와 프로모션에 따라 바뀌므로 결제 화면에서 최종 금액을 확인하세요.',
        'howToBook': how_to_book, 'howToRide': how_to_ride,
        'h2': {'route': f'{keyword} 노선', 'price': f'{keyword} 가격·티켓', 'ride': f'{keyword} 타는법', **(h2 or {})},
        'faq': faq + [{'q': f'CJTRAVEL10 할인코드가 {city}에도 되나요?', 'a': 'CITYTOURBUS 전용 City Sightseeing 코드입니다. ' + ('결제 화면에서 적용되는 것을 확인했습니다.' if cj_verified else f'{city} 적용 여부는 아직 결제 화면으로 확인하지 못했으니 입력 후 최종 금액을 확인하세요.')}],
        'images': images,
        'asideNote': aside or f"{tickets[0]['price']} · 날짜를 고르면 최종 가격이 바로 나옵니다.",
    }
    if night:
        d['night'] = night
    if extra:
        d['extra'] = extra
    with open(fp, 'w', encoding='utf-8') as f:
        json.dump(d, f, ensure_ascii=False, indent=2)
        f.write('\n')
    print('wrote', slug)
