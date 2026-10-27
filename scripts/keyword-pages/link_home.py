"""Points the homepage city chips for the given city slugs to their keyword pages and removes
old /api/compare rewrites for those paths. Usage: python3 scripts/keyword-pages/link_home.py <city>=<page-slug> ..."""
import json, re, sys
pairs = dict(a.split('=') for a in sys.argv[1:])
for f in ('index.html', 'index-v2.html'):
    s = open(f, encoding='utf-8').read()
    m = re.search(r"const clean=\[([^\]]*)\]", s)
    clean = [x.strip().strip("'") for x in m.group(1).split(',') if x.strip()]
    special = {c: p for c, p in pairs.items() if p != f'{c}-city-tour-bus'}
    for c, p in pairs.items():
        if p == f'{c}-city-tour-bus' and c not in clean:
            clean.insert(0, c)
        s = s.replace(f'href="/compare?city={c}"', f'href="/{p}"')
    s = s[:m.start()] + "const clean=[" + ",".join(f"'{c}'" for c in clean) + "]" + s[m.end():]
    for c, p in special.items():  # e.g. big-bus pages: map the slug explicitly
        marker = "function href(slug){"
        rule = f"if(slug==='{c}')return '/{p}';"
        if rule not in s:
            s = s.replace(marker, marker + rule, 1)
    open(f, 'w', encoding='utf-8').write(s)
v = json.load(open('vercel.json'))
before = len(v['rewrites'])
v['rewrites'] = [r for r in v['rewrites'] if r['source'].lstrip('/') not in pairs.values()]
json.dump(v, open('vercel.json', 'w'), indent=2); open('vercel.json', 'a').write('\n')
print('home linked', list(pairs), 'rewrites removed', before - len(v['rewrites']))
