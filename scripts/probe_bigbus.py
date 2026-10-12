#!/usr/bin/env python3
import asyncio
import re
from urllib.request import Request, urlopen
from playwright.async_api import async_playwright

URL = "https://www.bigbustours.com/en/london/london-tour-tickets-and-passes"
READER = "https://r.jina.ai/https://www.bigbustours.com/en/london/london-tour-tickets-and-passes"

def fetch(label, url):
    print(f"=== {label} ===")
    try:
        req = Request(url, headers={"User-Agent":"Mozilla/5.0","Accept-Language":"en-GB,en;q=0.9"})
        with urlopen(req, timeout=45) as r:
            raw = r.read().decode("utf-8", errors="replace")
            print("STATUS", r.status, "LEN", len(raw), "FINAL", r.url)
            for needle in ("Adult from", "One Day Ticket", "Discover Ticket", "Full price", "Access Denied", "Cloudflare"):
                print("RAW", needle, raw.lower().find(needle.lower()))
            m = re.search(r".{0,300}Adult from.{0,700}", raw, re.I|re.S)
            print("RAW_EXCERPT", (m.group(0) if m else raw[:1800]).replace("\n"," ")[:3000])
    except Exception as e:
        print("ERROR", repr(e))

async def main():
    fetch("urllib direct", URL)
    fetch("reader fallback", READER)

    print("=== playwright direct ===")
    async with async_playwright() as p:
        b = await p.chromium.launch(headless=True, args=["--no-sandbox"])
        page = await b.new_page(locale="en-GB", user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131 Safari/537.36")
        try:
            resp = await page.goto(URL, wait_until="domcontentloaded", timeout=60000)
            await page.wait_for_timeout(5000)
            text = await page.locator("body").inner_text()
            print("STATUS", resp.status if resp else None, "LEN", len(text), "FINAL", page.url, "TITLE", await page.title())
            for needle in ("Adult from", "One Day Ticket", "Discover Ticket", "Full price", "Access Denied", "Cloudflare"):
                print("BODY", needle, text.lower().find(needle.lower()))
        except Exception as e:
            print("PLAYWRIGHT_ERROR", repr(e))
        await b.close()

if __name__ == "__main__":
    asyncio.run(main())
