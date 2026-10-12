#!/usr/bin/env python3
# Temporary diagnostic for City Sightseeing checkout promo verification.
import asyncio
import json
import re
from playwright.async_api import async_playwright

async def dump(page):
    print("URL", page.url)
    for i in range(min(await page.locator("input").count(), 60)):
        el = page.locator("input").nth(i)
        try:
            value = await el.input_value()
        except Exception:
            value = None
        print("INPUT", json.dumps({
            "i": i,
            "type": await el.get_attribute("type"),
            "name": await el.get_attribute("name"),
            "placeholder": await el.get_attribute("placeholder"),
            "value": value,
            "aria": await el.get_attribute("aria-label"),
        }, ensure_ascii=False))
    body = await page.locator("body").inner_text()
    for line in body.splitlines():
        low = line.lower().strip()
        if any(k in low for k in ("promo", "discount", "coupon", "voucher", "subtotal", "total", "code")):
            print("MATCH", repr(line[:260]))
    print("TAIL", body[-6000:])

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True, args=["--no-sandbox"])
        page = await browser.new_page(locale="en-GB")
        await page.goto("https://city-sightseeing.com/en/17/barcelona", wait_until="domcontentloaded", timeout=60000)
        await page.wait_for_timeout(3000)
        try:
            allow = page.locator("button").filter(has_text=re.compile("Allow all", re.I))
            if await allow.count():
                await allow.first.click(timeout=2500)
        except Exception:
            pass

        books = page.locator("button").filter(has_text=re.compile("Book now", re.I))
        print("OUTER_BOOKS", await books.count())
        await books.first.click(timeout=10000)
        await page.wait_for_timeout(1600)

        cont = page.locator("button").filter(has_text=re.compile("Continue", re.I))
        print("CONTINUE", await cont.count())
        if await cont.count():
            await cont.last.click(timeout=10000)
            await page.wait_for_timeout(1600)

        # Material icon text is inside clickable controls; use the first visible add control.
        adds = page.locator("button").filter(has_text=re.compile("add_circle", re.I))
        print("ADD_BUTTONS", await adds.count())
        if not await adds.count():
            adds = page.locator("text=add_circle")
            print("ADD_TEXTS", await adds.count())
        if await adds.count():
            await adds.first.click(timeout=7000)
            await page.wait_for_timeout(900)

        books2 = page.locator("button").filter(has_text=re.compile("Book now", re.I))
        print("BOOKS_AFTER_PASSENGER", await books2.count())
        if await books2.count():
            await books2.last.click(timeout=10000)
            await page.wait_for_timeout(3500)

        cart = page.locator("button").filter(has_text=re.compile("Continue|Checkout|Cart", re.I))
        print("CART_CONTROLS", await cart.count())
        for i in range(await cart.count()):
            try:
                if await cart.nth(i).is_visible():
                    txt = (await cart.nth(i).inner_text()).strip()
                    print("CART_BUTTON", i, repr(txt))
            except Exception:
                pass

        await dump(page)
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
