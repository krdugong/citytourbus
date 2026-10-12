#!/usr/bin/env python3
# Temporary diagnostic used to map the City Sightseeing checkout flow before production promo verification.
# Probe revision 3: click the rendered button by accessible role/name.
import asyncio
import json
import re
from pathlib import Path
from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parents[1]

async def main():
    url = "https://city-sightseeing.com/en/17/barcelona"
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True, args=["--no-sandbox"])
        page = await browser.new_page(locale="en-GB")
        await page.goto(url, wait_until="domcontentloaded", timeout=60000)
        await page.wait_for_timeout(3000)
        try:
            allow = page.get_by_role("button", name=re.compile("Allow all", re.I))
            if await allow.count():
                await allow.first.click(timeout=2000)
        except Exception:
            pass

        books = page.get_by_role("button", name=re.compile("Book now", re.I))
        print("BOOK_BUTTONS", await books.count())
        if await books.count():
            await books.first.click(timeout=10000)
            await page.wait_for_timeout(5000)

        print("URL_AFTER_BOOK", page.url)
        print("TITLE", await page.title())
        print("INPUTS")
        for i in range(min(await page.locator("input").count(), 40)):
            el = page.locator("input").nth(i)
            try:
                value = await el.input_value()
            except Exception:
                value = None
            print(json.dumps({
                "i": i,
                "type": await el.get_attribute("type"),
                "name": await el.get_attribute("name"),
                "placeholder": await el.get_attribute("placeholder"),
                "value": value,
                "aria": await el.get_attribute("aria-label"),
            }, ensure_ascii=False))
        print("BUTTONS")
        for i in range(min(await page.locator("button").count(), 60)):
            el = page.locator("button").nth(i)
            try:
                txt = (await el.inner_text()).strip().replace("\n", " ")
            except Exception:
                txt = ""
            if txt:
                print(i, repr(txt[:180]))
        body = await page.locator("body").inner_text()
        print("BODY_HEAD")
        print(body[:5000])
        print("BODY_TAIL")
        print(body[-5000:])
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
