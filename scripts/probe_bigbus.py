#!/usr/bin/env python3
import json
from urllib.request import Request, urlopen
from urllib.error import HTTPError

HTML='https://www.bigbustours.com/en/london/london-tour-tickets-and-passes'
GQL='https://www.bigbustours.com/graphql'


def request(label, req):
    try:
        with urlopen(req,timeout=35) as r:
            raw=r.read().decode('utf-8',errors='replace')
            print(label,'STATUS',r.status,'LEN',len(raw),'CT',r.headers.get('content-type'))
            print(raw[:1200].replace('\n',' '))
    except HTTPError as e:
        raw=e.read().decode('utf-8',errors='replace')
        print(label,'HTTP',e.code,'LEN',len(raw),'CT',e.headers.get('content-type'))
        print(raw[:800].replace('\n',' '))
    except Exception as e:
        print(label,'ERROR',repr(e))

ua='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/131 Safari/537.36'
request('HTML',Request(HTML,headers={'User-Agent':ua,'Accept':'text/html,application/xhtml+xml'}))
query='{storeConfig{code store_code base_currency_code default_display_currency_code}}'
data=json.dumps({'query':query}).encode()
request('GRAPHQL',Request(GQL,data=data,headers={'User-Agent':ua,'Accept':'application/json','Content-Type':'application/json'},method='POST'))
