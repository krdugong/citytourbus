#!/usr/bin/env python3
# Temporary diagnostic for City Sightseeing checkout promo verification.
import asyncio
import json
import re
from playwright.async_api import async_playwright

async def visible_first(locator):
    for i in range(await locator.count()):
        try:
            if await locator.nth(i).is_visible():
                return locator.nth(i)
        except Exception:
            pass
    return None

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
    print("TAIL", body[-7000:])

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True, args=["--no-sandbox"])
        page = await browser.new_page(locale="en-GB")
        await page.goto("https://city-sightseeing.com/en/17/barcelona", wait_until="domcontentloaded", timeout=60000)
        await page.wait_for_timeout(3000)
        try:
            allow = page.locator("button").filter(has_text=re.compile("Allow all", re.I))
            button = await visible_first(allow)
            if button:
                await button.click(timeout=2500)
        except Exception:
            pass

        books = page.locator("button").filter(has_text=re.compile("Book now", re.I))
        book = await visible_first(books)
        print("OUTER_BOOKS", await books.count(), "VISIBLE", bool(book))
        await book.click(timeout=10000)
        await page.wait_for_timeout(1700)

        # Select the first visible departure time if the product requires one.
        times = page.locator("button").filter(has_text=re.compile(r"^\s*\d{1,2}:\d{2}\s*$"))
        time_button = await visible_first(times)
        print("TIME_BUTTONS", await times.count(), "VISIBLE", bool(time_button))
        if time_button:
            print("SELECT_TIME", (await time_button.inner_text()).strip())
            await time_button.click(timeout=7000)
            await page.wait_for_timeout(600)

        cont = page.locator("button").filter(has_text=re.compile("Continue", re.I))
        cont_button = await visible_first(cont)
        print("CONTINUE", await cont.count(), "VISIBLE", bool(cont_button))
        if cont_button:
            await cont_button.click(timeout=10000)
            await page.wait_for_timeout(1400)

        # Passenger step: the first add_circle corresponds to the adult row for this product.
        adds = page.locator("button").filter(has_text=re.compile("add_circle", re.I))
        add_button = await visible_first(adds)
        if not add_button:
            texts = page.locator("text=add_circle")
            add_button = await visible_first(texts)
            print("ADD_TEXTS", await texts.count(), "VISIBLE", bool(add_button))
        else:
            print("ADD_BUTTONS", await adds.count(), "VISIBLE", True)
        if add_button:
            await add_button.click(timeout=7000)
            await page.wait_for_timeout(700)

        books2 = page.locator("button").filter(has_text=re.compile("Book now", re.I))
        visible_books = []
        for i in range(await books2.count()):
            if await books2.nth(i).is_visible():
                visible_books.append(books2.nth(i))
        print("VISIBLE_BOOKS_AFTER_PASSENGER", len(visible_books))
        if visible_books:
            await visible_books[-1].click(timeout=10000)
            await page.wait_for_timeout(3500)

        await dump(page)
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
