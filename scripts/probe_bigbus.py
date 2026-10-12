#!/usr/bin/env python3
import json
from urllib.request import Request, urlopen
from urllib.error import HTTPError

URL='https://www.bigbustours.com/graphql'
SKU='LON020AD'
QUERIES=[
  ('count-only','''query Q($sku:String!){products(filter:{sku:{eq:$sku}}){total_count}}'''),
  ('sku-only','''query Q($sku:String!){products(filter:{sku:{eq:$sku}}){total_count items{sku}}}'''),
  ('basic-price','''query Q($sku:String!){products(filter:{sku:{eq:$sku}}){total_count items{sku name price_range{minimum_price{regular_price{value currency} final_price{value currency}}}}}}'''),
  ('discount','''query Q($sku:String!){products(filter:{sku:{eq:$sku}}){total_count items{sku name price_range{minimum_price{regular_price{value currency} final_price{value currency} discount{percent_off}}}}}}'''),
]

def run(label,q):
    payload=json.dumps({'query':q,'variables':{'sku':SKU}}).encode()
    req=Request(URL,data=payload,headers={'User-Agent':'Mozilla/5.0','Accept':'application/json','Content-Type':'application/json'},method='POST')
    try:
      with urlopen(req,timeout=30) as r:
        raw=r.read().decode('utf-8',errors='replace')
        print('\n',label,'STATUS',r.status,'LEN',len(raw)); print(raw[:6000])
        return r.status
    except HTTPError as e:
      raw=e.read().decode('utf-8',errors='replace')
      print('\n',label,'HTTP',e.code,'LEN',len(raw)); print(raw[:1000]); return e.code
    except Exception as e:
      print('\n',label,'ERROR',repr(e)); return None

# Stop after the first WAF challenge so later requests do not poison the signal.
for label,q in QUERIES:
    status=run(label,q)
    if status != 200:
        break
