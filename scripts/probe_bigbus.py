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
            print(raw[:6000])
            return raw
    except HTTPError as e:
        raw = e.read().decode("utf-8", errors="replace")
        print("HTTP_ERROR", e.code, "CT", e.headers.get("content-type"), "LEN", len(raw), "URL", url)
        print(raw[:2500])
    except URLError as e:
        print("URL_ERROR", repr(e))
    except Exception as e:
        print("ERROR", repr(e))
    return None


# Magento / Adobe Commerce public GraphQL probes.
request(
    "graphql storeConfig GET",
    BASE + "/graphql?" + urllib.parse.urlencode({"query": "{storeConfig{base_currency_code default_display_currency_code store_name}}"}),
)
request(
    "graphql storeConfig POST",
    BASE + "/graphql",
    method="POST",
    payload={"query": "{storeConfig{base_currency_code default_display_currency_code store_name}}"},
)
product_query = '''
query ProductByUrlKey($key: String!) {
  products(filter: {url_key: {eq: $key}}) {
    total_count
    items {
      uid sku name url_key
      price_range {
        minimum_price {
          regular_price { value currency }
          final_price { value currency }
          discount { amount_off percent_off }
        }
      }
    }
  }
}
'''
request(
    "graphql product POST",
    BASE + "/graphql",
    method="POST",
    payload={"query": product_query, "variables": {"key": PRODUCT_KEY}},
    headers={"Store": "en_london"},
)

# Common Magento REST probes. These are public config/product routes if enabled.
request("rest store configs", BASE + "/rest/V1/store/storeConfigs")
criteria = urllib.parse.urlencode({
    "searchCriteria[filter_groups][0][filters][0][field]": "url_key",
    "searchCriteria[filter_groups][0][filters][0][value]": PRODUCT_KEY,
    "searchCriteria[filter_groups][0][filters][0][condition_type]": "eq",
})
request("rest product search", BASE + "/rest/V1/products?" + criteria)

# Known page endpoints for comparison.
request("html direct", BASE + "/en/london/london-tour-tickets-and-passes", headers={"Accept": "text/html,application/xhtml+xml"})
