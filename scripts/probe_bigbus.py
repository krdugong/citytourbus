#!/usr/bin/env python3
import json
from urllib.request import Request, urlopen
from urllib.error import HTTPError

BASE = "https://www.bigbustours.com/graphql"
STORE = "london_en"


def gql(label, query, variables=None, store=STORE):
    print(f"\n=== {label} ===")
    payload = json.dumps({"query": query, "variables": variables or {}}).encode("utf-8")
    headers = {
        "User-Agent": "Mozilla/5.0",
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Store": store,
    }
    req = Request(BASE, data=payload, headers=headers, method="POST")
    try:
        with urlopen(req, timeout=30) as r:
            raw = r.read().decode("utf-8", errors="replace")
            print("STATUS", r.status, "LEN", len(raw))
            print(raw[:20000])
            return json.loads(raw)
    except HTTPError as e:
        raw = e.read().decode("utf-8", errors="replace")
        print("HTTP", e.code, raw[:5000])
    except Exception as e:
        print("ERROR", repr(e))
    return None

PRODUCT_FIELDS = """
  sku name url_key __typename
  price_range {
    minimum_price {
      regular_price { value currency }
      final_price { value currency }
      discount { amount_off percent_off }
    }
    maximum_price {
      regular_price { value currency }
      final_price { value currency }
      discount { amount_off percent_off }
    }
  }
"""

query_key = """
query ByKey($key:String!){
  products(filter:{url_key:{eq:$key}}){
    total_count
    items{
      %s
    }
  }
}
""" % PRODUCT_FIELDS

for key in [
    "london-same-day-ticket-without-cruise",
    "london-discover-ticket",
    "london-essential-ticket",
    "london-explore-ticket",
]:
    gql("url_key " + key, query_key, {"key": key})

query_search = """
query Search($q:String!){
  products(search:$q,pageSize:30){
    total_count
    items{
      %s
    }
  }
}
""" % PRODUCT_FIELDS

for term in ["One Day Ticket", "Discover Ticket", "Essential Ticket", "Explore Ticket"]:
    gql("search " + term, query_search, {"q": term})
