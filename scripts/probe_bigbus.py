#!/usr/bin/env python3
import json
from urllib.request import Request, urlopen
from urllib.error import HTTPError

URL="https://www.bigbustours.com/graphql"
PREFIXES=("LON","PAR","ROM","BER","MAD","DUB","NY","NYC","SYD","CHI","LAS","MIA","WDC","SFO","BUD")


def gql(label, query, variables=None):
    print(f"\n=== {label} ===")
    data=json.dumps({"query":query,"variables":variables or {}}).encode()
    req=Request(URL,data=data,headers={"User-Agent":"Mozilla/5.0","Accept":"application/json","Content-Type":"application/json"},method="POST")
    try:
        with urlopen(req,timeout=35) as r:
            raw=r.read().decode("utf-8",errors="replace")
            print("STATUS",r.status,"LEN",len(raw))
            obj=json.loads(raw)
            return obj
    except HTTPError as e:
        raw=e.read().decode("utf-8",errors="replace")
        print("HTTP",e.code,raw[:1500]); return None
    except Exception as e:
        print("ERROR",repr(e)); return None

currency_q='''{currency{base_currency_code base_currency_symbol default_display_currency_code default_display_currency_symbol available_currency_codes exchange_rates{currency_to rate}}}'''
obj=gql("currency",currency_q)
print(json.dumps(obj,ensure_ascii=False)[:10000])

search_q='''query Search($q:String!){products(search:$q,pageSize:100,currentPage:1){total_count items{sku name url_key __typename price_range{minimum_price{regular_price{value currency} final_price{value currency} discount{amount_off percent_off}} maximum_price{regular_price{value currency} final_price{value currency} discount{amount_off percent_off}}}}}}'''

for term in ["One Day Ticket","Discover Ticket","Essential Ticket","Explore Ticket","Classic Ticket","Hop On Hop Off"]:
    obj=gql("search "+term,search_q,{"q":term})
    if not obj: continue
    products=((obj.get("data") or {}).get("products") or {})
    print("TOTAL",products.get("total_count"))
    for p in products.get("items") or []:
        sku=(p.get("sku") or "").upper()
        name=(p.get("name") or "")
        if sku.startswith(PREFIXES) or any(city in name.lower() for city in ("london","paris","rome","berlin","madrid","dubai","new york","sydney","chicago","las vegas","miami","washington","san francisco","budapest")):
            print(json.dumps(p,ensure_ascii=False,separators=(",",":")))
