#!/usr/bin/env python3
import asyncio
import json
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
            for name in ("Accept all", "Accept", "I agree"):
                b = page.get_by_role("button", name=name)
                if await b.count():
                    await b.first.click(timeout=1500)
                    break
        except Exception:
            pass

        books = page.get_by_text("Book now", exact=True)
        print("BOOK_BUTTONS", await books.count())
        if await books.count():
            await books.first.click(timeout=10000)
            await page.wait_for_timeout(3500)

        print("URL_AFTER_BOOK", page.url)
        print("TITLE", await page.title())
        print("INPUTS")
        for i in range(min(await page.locator("input").count(), 30)):
            el = page.locator("input").nth(i)
            print(json.dumps({
                "i": i,
                "type": await el.get_attribute("type"),
                "name": await el.get_attribute("name"),
                "placeholder": await el.get_attribute("placeholder"),
                "value": await el.input_value() if await el.is_editable() else None,
                "aria": await el.get_attribute("aria-label"),
            }, ensure_ascii=False))
        print("BUTTONS")
        for i in range(min(await page.locator("button").count(), 50)):
            el = page.locator("button").nth(i)
            try:
                txt = (await el.inner_text()).strip().replace("\n", " ")
            except Exception:
                txt = ""
            if txt:
                print(i, repr(txt[:160]))
        body = await page.locator("body").inner_text()
        print("BODY_TAIL")
        print(body[-6000:])
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
