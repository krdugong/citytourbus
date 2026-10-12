#!/usr/bin/env python3
import json
import urllib.parse
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

BASE = "https://www.bigbustours.com"
PRODUCT_KEY = "london-same-day-ticket-without-cruise"


def request(label, url, method="GET", payload=None, headers=None):
    print(f"\n=== {label} ===")
    body = None
    hdrs = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131 Safari/537.36",
        "Accept": "application/json,text/plain,*/*",
        "Accept-Language": "en-GB,en;q=0.9",
    }
    if headers:
        hdrs.update(headers)
    if payload is not None:
        body = json.dumps(payload).encode("utf-8")
        hdrs["Content-Type"] = "application/json"
    req = Request(url, data=body, headers=hdrs, method=method)
    try:
        with urlopen(req, timeout=30) as r:
            raw = r.read().decode("utf-8", errors="replace")
            print("STATUS", r.status, "CT", r.headers.get("content-type"), "LEN", len(raw), "FINAL", r.url)
            print(raw[:12000])
            return raw
    except HTTPError as e:
        raw = e.read().decode("utf-8", errors="replace")
        print("HTTP_ERROR", e.code, "CT", e.headers.get("content-type"), "LEN", len(raw), "URL", url)
        print(raw[:5000])
    except URLError as e:
        print("URL_ERROR", repr(e))
    except Exception as e:
        print("ERROR", repr(e))
    return None


def gql(label, query, variables=None, headers=None):
    return request(label, BASE + "/graphql", method="POST", payload={"query": query, "variables": variables or {}}, headers=headers)


gql(
    "availableStores",
    """{availableStores(useCurrentGroup:false){id code store_code store_name locale base_currency_code default_display_currency_code}}""",
)

gql(
    "storeConfig extended",
    """{storeConfig{id code store_code store_name locale base_currency_code default_display_currency_code secure_base_url}}""",
)

product_query = '''
query ProductByUrlKey($key: String!) {
  products(filter: {url_key: {eq: $key}}) {
    total_count
    items {
      uid sku name url_key __typename
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
    }
  }
}
'''

gql("product default store", product_query, {"key": PRODUCT_KEY})
gql("product default store GBP", product_query, {"key": PRODUCT_KEY}, headers={"Content-Currency": "GBP"})

search_query = '''
query Search($term: String!) {
  products(search: $term, pageSize: 12) {
    total_count
    items {
      sku name url_key
      price_range { minimum_price { regular_price { value currency } final_price { value currency } discount { percent_off } } }
    }
  }
}
'''
gql("search London ticket", search_query, {"term": "London One Day Ticket"})
