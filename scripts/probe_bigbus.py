#!/usr/bin/env python3
import json
from urllib.request import Request, urlopen
from urllib.error import HTTPError

URL="https://www.bigbustours.com/graphql"
QUERY='''query Search($term: String!) {
  products(search: $term, pageSize: 12) {
    total_count
    items {
      sku name url_key
      price_range { minimum_price { regular_price { value currency } final_price { value currency } discount { percent_off } } }
    }
  }
}'''
payload=json.dumps({"query":QUERY,"variables":{"term":"London Discover Ticket"}}).encode("utf-8")
req=Request(URL,data=payload,headers={"User-Agent":"Mozilla/5.0","Accept":"application/json","Content-Type":"application/json"},method="POST")
try:
    with urlopen(req,timeout=30) as r:
        raw=r.read().decode("utf-8",errors="replace")
        print("STATUS",r.status,"LEN",len(raw))
        print(raw)
except HTTPError as e:
    raw=e.read().decode("utf-8",errors="replace")
    print("HTTP",e.code,"LEN",len(raw)); print(raw[:3000])
except Exception as e:
    print("ERROR",repr(e))
