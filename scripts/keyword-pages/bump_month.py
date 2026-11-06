"""Moves the month label on Korean keyword pages to the current month.

Changes "(YYYY년 M월)" at the end of the title, "YYYY년 M월 기준" at the start of the
description and the main card eyebrow "YYYY년 M월 업데이트", then sets updated to
today (adding published first if a page has none). Dated facts such as price check
dates and verified are left alone. Prints the changed slugs, one per line.

Usage (repo root): python3 -I scripts/keyword-pages/bump_month.py [YYYY-MM-DD]
"""
import datetime, glob, json, re, sys

day = sys.argv[1] if len(sys.argv) > 1 else datetime.datetime.now(
    datetime.timezone(datetime.timedelta(hours=9))).date().isoformat()
y, m = int(day[:4]), int(day[5:7])
label = f'{y}년 {m}월'

for f in sorted(glob.glob('data/keyword-pages/*.json')):
    t = o = open(f, encoding='utf-8').read()
    t = re.sub(r'("title": "[^"\n]*)\(\d{4}년 \d{1,2}월\)"', rf'\g<1>({label})"', t)
    t = re.sub(r'("description": ")\d{4}년 \d{1,2}월 기준', rf'\g<1>{label} 기준', t)
    t = re.sub(r'"eyebrow": "\d{4}년 \d{1,2}월 업데이트"', f'"eyebrow": "{label} 업데이트"', t)
    if t == o:
        continue
    u = re.search(r'\n(\s*)"updated": "([\d-]+)",', t)
    if '"published"' not in t:
        t = t.replace(u.group(0), f'\n{u.group(1)}"published": "{u.group(2)}",{u.group(0)}', 1)
    t = re.sub(r'"updated": "[\d-]+"', f'"updated": "{day}"', t, count=1)
    json.loads(t)
    open(f, 'w', encoding='utf-8').write(t)
    print(f.split('/')[-1][:-5])
