#!/usr/bin/env python3
# Temporary diagnostic used to map the City Sightseeing checkout flow before production promo verification.
# Probe revision 4: add one adult and proceed to cart/checkout.
import asyncio
import json
import re
from pathlib import Path
from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parents[1]

async def dump(page, label):
    print("STATE", label, "URL", page.url)
    print("INPUTS")
    for i in range(min(await page.locator("input").count(), 50)):
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
    for i in range(min(await page.locator("button").count(), 80)):
        el = page.locator("button").nth(i)
        try:
            txt = (await el.inner_text()).strip().replace("\n", " ")
        except Exception:
            txt = ""
        if txt:
            print(i, repr(txt[:180]))
    body = await page.locator("body").inner_text()
    print("BODY_PROMO_LINES")
    for line in body.splitlines():
        low = line.lower()
        if any(k in low for k in ("promo", "discount", "coupon", "voucher", "subtotal", "total", "code")):
            print(repr(line[:240]))
    print("BODY_TAIL")
    print(body[-7000:])

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
        print("OUTER_BOOK_BUTTONS", await books.count())
        await books.first.click(timeout=10000)
        await page.wait_for_timeout(2000)

        adds = page.get_by_text("add_circle", exact=True)
        print("ADD_CONTROLS", await adds.count())
        if await adds.count():
            await adds.first.click(timeout=5000)
            await page.wait_for_timeout(1000)

        # Use the last visible Book now, which belongs to the opened booking modal.
        modal_books = page.get_by_role("button", name=re.compile("^Book now$", re.I))
        print("MODAL_BOOKS", await modal_books.count())
        if await modal_books.count():
            await modal_books.last.click(timeout=10000)
            await page.wait_for_timeout(5000)

        # Some layouts require a separate Continue after adding the item.
        cont = page.get_by_role("button", name=re.compile("^Continue$", re.I))
        if await cont.count() and await cont.last.is_visible():
            print("CLICK_CONTINUE")
            await cont.last.click(timeout=10000)
            await page.wait_for_timeout(5000)

        await dump(page, "AFTER_CART")
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
