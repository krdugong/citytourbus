"""Site checks: sitemap URLs exist, no dead internal links, no missing images, JSON-LD parses,
index.html == index-v2.html. Usage: python3 scripts/keyword-pages/validate.py"""
import re, json, os, glob
SITE = 'https://www.citytourbus.kr'
v = json.load(open('vercel.json')); rew = {r['source'] for r in v['rewrites']}; redir = {r['source'] for r in v['redirects']}
ex = lambda p: p == '/' or p in rew or os.path.exists(p.strip('/') + '.html') or os.path.exists(p.strip('/') + '/index.html')
locs = re.findall(r'<loc>([^<]+)</loc>', open('sitemap.xml').read())
bad = [l for l in locs if (l != SITE + '/' and l.endswith('/')) or not ex(l[len(SITE):])]
probs = []
for f in [f for f in glob.glob('*.html') + glob.glob('*/**/*.html', recursive=True) if not f.startswith(('astro-site', '_astro'))]:
    h = open(f, encoding='utf-8').read()
    for s in re.findall(r'<script type="application/ld\+json">(.*?)</script>', h, re.S):
        try: json.loads(s)
        except Exception as e: probs.append((f, 'json', str(e)))
    for src in re.findall(r'<img[^>]+src="(/[^"]+)"', h):
        if not os.path.exists(src.lstrip('/')): probs.append((f, 'missing img', src))
    for a in re.findall(r'href="(/[a-z0-9-]+)"', h):
        if not ex(a) and a not in redir: probs.append((f, 'dead link', a))
same = open('index.html').read() == open('index-v2.html').read()
import subprocess
js = subprocess.run(['node', '-e', "const h=require('fs').readFileSync('index.html','utf8');for(const m of h.matchAll(/<script>([\\s\\S]*?)<\\/script>/g))new Function(m[1]);"], capture_output=True, text=True)
if js.returncode: probs.append(('index.html', 'inline script does not parse', js.stderr.strip().splitlines()[-1] if js.stderr else ''))
print(f'sitemap {len(locs)} dupes {len(locs) - len(set(locs))} bad {bad}')
print('problems', probs[:20]); print('home in sync', same)
raise SystemExit(1 if bad or probs or not same or len(locs) != len(set(locs)) else 0)
