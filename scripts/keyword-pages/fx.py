#!/usr/bin/env python3
"""Refreshes data/keyword-pages/_fx.json (KRW per unit of each foreign currency) from open.er-api.com.
The city pages show "약 N원" next to foreign prices using this file; the date is printed on the page.
Usage (from repo root): python3 -I scripts/keyword-pages/fx.py"""
import json, subprocess, datetime
CODES = ['EUR', 'USD', 'GBP', 'JPY', 'HKD', 'SGD', 'AUD', 'THB', 'VND', 'AED', 'SAR', 'CAD', 'NZD', 'CHF', 'SEK', 'NOK', 'DKK', 'ISK', 'ZAR', 'COP', 'PAB', 'CZK', 'HUF', 'PLN']
raw = subprocess.run(['curl', '-s', '--max-time', '20', 'https://open.er-api.com/v6/latest/KRW'], capture_output=True, text=True).stdout
d = json.loads(raw)
assert d.get('result') == 'success', raw[:200]
rates = {c: round(1 / d['rates'][c], 4) for c in CODES if c in d['rates']}
out = {'date': datetime.datetime.strptime(d['time_last_update_utc'][:16], '%a, %d %b %Y').strftime('%Y-%m-%d'), 'source': 'open.er-api.com', 'krwPer': rates}
json.dump(out, open('data/keyword-pages/_fx.json', 'w'), ensure_ascii=False, indent=1)
print(out['date'], {k: round(v) for k, v in rates.items()})
