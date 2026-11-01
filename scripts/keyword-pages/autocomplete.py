#!/usr/bin/env python3
"""Collect Naver autocomplete suggestions for every keyword page into data/keyword-pages/_autocomplete.json
({slug: {seed: [suggestions]}}). Seeds: the page keyword, its spaced variant ("시티투어 버스"), and the other
brand phrasing. Re-run before scripts/keyword-pages/topics.py; results are cached for the day in .cache/ac/.
Usage (repo root): python3 scripts/keyword-pages/autocomplete.py [slug ...]
"""
import glob, json, os, subprocess, sys, time, urllib.parse

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA = os.path.join(ROOT, 'data/keyword-pages')
CACHE = os.path.join(ROOT, 'scripts/keyword-pages/.cache/ac', time.strftime('%Y-%m-%d'))
os.makedirs(CACHE, exist_ok=True)
UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36'

def ac(q):
  f = os.path.join(CACHE, urllib.parse.quote(q, safe='') + '.json')
  if os.path.exists(f): return json.load(open(f))
  url = 'https://ac.search.naver.com/nx/ac?' + urllib.parse.urlencode({'q': q, 'con': 1, 'frm': 'nv', 'ans': 2, 'r_format': 'json', 'r_enc': 'UTF-8', 'r_unicode': 0, 't_koreng': 1, 'run': 2, 'rev': 4, 'q_enc': 'UTF-8', 'st': 100})
  try:
    raw = subprocess.run(['curl', '-s', '--max-time', '10', '-A', UA, '-H', 'Referer: https://www.naver.com/', url], capture_output=True, text=True).stdout
    out = [it[0] for it in (json.loads(raw).get('items') or [[]])[0]]
  except Exception as e:
    print('ERR', q, str(e)[:80], file=sys.stderr); return []
  json.dump(out, open(f, 'w'), ensure_ascii=False); time.sleep(0.35)
  return out

def seeds(p):
  k, city = p['keyword'], p['city']
  s = [k]
  if k.endswith('시티투어버스'):
    s += [k[:-6] + '시티투어 버스', f'{city} 빅버스']
  elif k.endswith('빅버스'):
    s += [f'{city} 시티투어버스', f'{city} 빅버스 투어']
  return list(dict.fromkeys(s))

only = set(sys.argv[1:])
out_path = os.path.join(DATA, '_autocomplete.json')
out = json.load(open(out_path)) if os.path.exists(out_path) else {}
for f in sorted(glob.glob(os.path.join(DATA, '*.json'))):
  slug = os.path.basename(f)[:-5]
  if slug.startswith('_') or (only and slug not in only): continue
  p = json.load(open(f))
  out[slug] = {s: ac(s) for s in seeds(p)}
  got = sum(len(v) for v in out[slug].values())
  print(f'{slug}: {got}')
out['_collected'] = time.strftime('%Y-%m-%d')
json.dump(out, open(out_path, 'w'), ensure_ascii=False, indent=0)
