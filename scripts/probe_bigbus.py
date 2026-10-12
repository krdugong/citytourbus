#!/usr/bin/env python3
import json
import urllib.parse
from urllib.request import Request, urlopen
from urllib.error import HTTPError

BASE = "https://www.bigbustours.com"
STORE = "london_en"

STORE_QUERY = "{storeConfig{code store_code store_name base_currency_code default_display_currency_code}}"
SEARCH_QUERY = '''query Search($q:String!){products(search:$q,pageSize:8){total_count items{sku name url_key price_range{minimum_price{regular_price{value currency} final_price{value currency} discount{percent_off}}}}}}'''


def call(label, url, *, method="GET", headers=None, payload=None):
    print(f"\n=== {label} ===")
    hdrs = {"User-Agent":"Mozilla/5.0","Accept":"application/json,text/plain,*/*"}
    if headers: hdrs.update(headers)
    data = None
    if payload is not None:
        data = json.dumps(payload).encode()
        hdrs["Content-Type"] = "application/json"
    req = Request(url, data=data, headers=hdrs, method=method)
    try:
        with urlopen(req, timeout=25) as r:
            raw = r.read().decode("utf-8", errors="replace")
            print("STATUS", r.status, "FINAL", r.url, "LEN", len(raw))
            print(raw[:9000])
            return r.status, raw
    except HTTPError as e:
        raw=e.read().decode("utf-8", errors="replace")
        print("HTTP", e.code, "FINAL", e.url, "LEN", len(raw))
        print(raw[:1200])
        return e.code, raw
    except Exception as e:
        print("ERROR", repr(e)); return None, ""


def get_url(path, params):
    return BASE + path + "?" + urllib.parse.urlencode(params)

selectors = [
    ("query ___store", "/graphql", {"___store":STORE,"query":STORE_QUERY}, None),
    ("query store", "/graphql", {"store":STORE,"query":STORE_QUERY}, None),
    ("path store", f"/{STORE}/graphql", {"query":STORE_QUERY}, None),
    ("cookie store", "/graphql", {"query":STORE_QUERY}, {"Cookie":f"store={STORE}"}),
    ("cookie store + currency", "/graphql", {"query":STORE_QUERY}, {"Cookie":f"store={STORE}; currency=GBP"}),
]

working=[]
for label,path,params,headers in selectors:
    status,raw=call(label,get_url(path,params),headers=headers)
    try:
        obj=json.loads(raw)
        cfg=obj.get("data",{}).get("storeConfig") or {}
        print("SELECTED", cfg.get("code"), cfg.get("store_code"), cfg.get("base_currency_code"))
        if status==200 and (cfg.get("code")==STORE or cfg.get("store_code")==STORE):
            working.append((label,path,headers,params))
    except Exception:
        pass

print("\nWORKING_SELECTORS", [x[0] for x in working])
for label,path,headers,base_params in working:
    # Test one core-ticket search through the same selector.
    if path == "/graphql":
        params={k:v for k,v in base_params.items() if k != "query"}
        params.update({"query":SEARCH_QUERY,"variables":json.dumps({"q":"One Day Ticket"})})
        call("PRODUCT via "+label,get_url(path,params),headers=headers)
    else:
        call("PRODUCT via "+label,get_url(path,{"query":SEARCH_QUERY,"variables":json.dumps({"q":"One Day Ticket"})}),headers=headers)
