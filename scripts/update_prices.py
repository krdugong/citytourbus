#!/usr/bin/env python3
import asyncio
import json
import math
import re
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parents[1]
CONFIG_PATH = ROOT / "data" / "price-sources.json"
STACK_PATH = ROOT / "data" / "city-sightseeing-stack.json"
OUTPUT_PATH = ROOT / "prices.json"

MONEY_RE = re.compile(
    r"(?P<currency>AED|AU\$|A\$|CA\$|C\$|US\$|NZ\$|HK\$|SG\$|£|€|\$|¥|JPY|GBP|EUR|USD)\s*(?P<amount>\d{1,5}(?:[.,]\d{1,2})?)",
    re.I,
)
PERCENT_RE = re.compile(r"(?:-|save\s+|up\s+to\s+)?(?P<pct>\d{1,2})\s*%", re.I)


def now_iso():
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def load_json(path, default):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return default


def normalize_lines(text):
    return [re.sub(r"\s+", " ", line).strip() for line in text.splitlines() if line.strip()]


def money_tokens(lines, start, end):
    out = []
    for idx in range(max(0, start), min(len(lines), end)):
        for m in MONEY_RE.finditer(lines[idx]):
            amount = float(m.group("amount").replace(",", "."))
            if amount > 0:
                out.append((idx, m.group("currency").upper(), amount, lines[idx]))
    return out


def pct_near(lines, start, end):
    vals = []
    for idx in range(max(0, start), min(len(lines), end)):
        for m in PERCENT_RE.finditer(lines[idx]):
            pct = int(m.group("pct"))
            if 1 <= pct <= 80:
                vals.append(pct)
    return max(vals) if vals else None


def choose_candidate(candidates):
    valid = [c for c in candidates if c.get("salePrice") and c["salePrice"] > 0]
    if not valid:
        return None
    return sorted(valid, key=lambda c: (c["salePrice"], c.get("regularPrice") or 10**9))[0]


def candidate_from_window(lines, from_idx, label_idx=None):
    tokens = money_tokens(lines, from_idx, from_idx + 7)
    if not tokens:
        return None
    # Keep the first currency group around the same product card.
    currency = tokens[0][1]
    vals = [t[2] for t in tokens if t[1] == currency][:3]
    if not vals:
        return None
    sale = min(vals)
    regular = max(vals) if len(vals) >= 2 and max(vals) > sale else None
    explicit_pct = pct_near(lines, (label_idx or from_idx) - 4, from_idx + 6)
    calc_pct = None
    if regular and regular > sale:
        calc_pct = round((1 - sale / regular) * 100)
    onsite_pct = explicit_pct or calc_pct
    return {
        "currency": currency,
        "salePrice": round(sale, 2),
        "regularPrice": round(regular, 2) if regular else None,
        "onsiteDiscountPercent": onsite_pct,
        "label": lines[label_idx] if label_idx is not None else None,
    }


def extract_city_sightseeing(text):
    lines = normalize_lines(text)
    candidates = []
    bus_terms = ("hop-on hop-off", "hop on hop off", "bus (", "bus tour", "panoramic")
    exclude_terms = ("museum", "cruise", "boat", "aquarium", "oceanarium", "stadium", "flamenco", "walking tour")

    for i, line in enumerate(lines):
        low = line.lower()
        if not any(term in low for term in bus_terms):
            continue
        if any(term in low for term in exclude_terms) or "+" in line:
            continue
        for j in range(i, min(len(lines), i + 18)):
            if lines[j].lower() == "from" or lines[j].lower().startswith("from "):
                cand = candidate_from_window(lines, j, i)
                if cand:
                    candidates.append(cand)
                break

    # Fallback: product page or layout where title is separated from price.
    if not candidates:
        for i, line in enumerate(lines):
            if line.lower() == "from" or line.lower().startswith("from "):
                cand = candidate_from_window(lines, i)
                if cand:
                    candidates.append(cand)

    return choose_candidate(candidates)


def extract_big_bus(text):
    lines = normalize_lines(text)
    candidates = []
    for i, line in enumerate(lines):
        low = line.lower()
        if low == "from" or low.startswith("from ") or "adult from" in low or "online from" in low:
            cand = candidate_from_window(lines, i)
            if cand:
                candidates.append(cand)

    # Some Big Bus pages put the ticket name several lines before the price.
    if not candidates:
        for i, line in enumerate(lines):
            if "ticket" in line.lower() or "tour" in line.lower():
                for j in range(i, min(len(lines), i + 12)):
                    if MONEY_RE.search(lines[j]):
                        cand = candidate_from_window(lines, j, i)
                        if cand:
                            candidates.append(cand)
                        break

    return choose_candidate(candidates)


def effective_discount(onsite_pct, code_pct):
    if not onsite_pct or not code_pct:
        return None
    return round((1 - (1 - onsite_pct / 100) * (1 - code_pct / 100)) * 100, 1)


def code_price(price, code_pct):
    if not price or not code_pct:
        return None
    return round(price * (1 - code_pct / 100), 2)


async def get_page_text(browser, url):
    page = await browser.new_page(
        locale="en-US",
        user_agent=(
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
            "(KHTML, like Gecko) Chrome/131.0 Safari/537.36 CITYTOURBUS-PriceMonitor/1.0"
        ),
    )
    try:
        await page.goto(url, wait_until="domcontentloaded", timeout=60000)
        try:
            for label in ("Accept all", "Accept", "I agree", "Allow all"):
                btn = page.get_by_role("button", name=re.compile(label, re.I))
                if await btn.count():
                    await btn.first.click(timeout=1500)
                    break
        except Exception:
            pass
        await page.wait_for_timeout(3500)
        return await page.locator("body").inner_text(timeout=15000)
    finally:
        await page.close()


async def scrape_one(browser, operator, city, item, stack_overrides, previous):
    checked = now_iso()
    prev = previous or {}
    try:
        text = await get_page_text(browser, item["source"])
        parsed = extract_city_sightseeing(text) if operator == "cs" else extract_big_bus(text)
        if not parsed:
            raise RuntimeError("No plausible bus price found")

        result = {
            "status": "ok",
            "checkedAt": checked,
            "lastSuccessAt": checked,
            "sourceUrl": item["source"],
            "affiliateUrl": item["affiliate"],
            **parsed,
        }

        if operator == "cs":
            stack = stack_overrides.get(city, {})
            stack_status = stack.get("status", "unknown")
            code_pct = 10
            result["promoCode"] = "CJTRAVEL10"
            result["promoPercent"] = code_pct
            result["stacking"] = {
                "status": stack_status,
                "verifiedAt": stack.get("verifiedAt"),
                "evidence": stack.get("evidence"),
            }
            if stack_status == "verified-stackable":
                result["codeAppliedPriceEstimate"] = code_price(result["salePrice"], code_pct)
                result["effectiveDiscountPercent"] = effective_discount(result.get("onsiteDiscountPercent"), code_pct)
            elif stack_status == "verified-not-stackable":
                result["effectiveDiscountPercent"] = max(result.get("onsiteDiscountPercent") or 0, code_pct)

        return result
    except Exception as exc:
        # Never erase a last-known-good price because one scrape failed.
        if prev:
            stale = dict(prev)
            stale.update({
                "status": "stale",
                "checkedAt": checked,
                "lastError": str(exc)[:240],
                "sourceUrl": item["source"],
                "affiliateUrl": item["affiliate"],
            })
            return stale
        return {
            "status": "error",
            "checkedAt": checked,
            "lastSuccessAt": None,
            "sourceUrl": item["source"],
            "affiliateUrl": item["affiliate"],
            "lastError": str(exc)[:240],
        }


async def main():
    cfg = load_json(CONFIG_PATH, {})
    stack_cfg = load_json(STACK_PATH, {"cities": {}}).get("cities", {})
    previous = load_json(OUTPUT_PATH, {"cities": {}})
    prev_cities = previous.get("cities", {})

    output = {
        "schemaVersion": 1,
        "generatedAt": now_iso(),
        "note": "Prices are scraped only from operators' official pages. Affiliate URLs are never used by the scraper.",
        "cities": {},
    }

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True, args=["--no-sandbox"])
        try:
            jobs = []
            for city, item in cfg.get("bigBus", {}).get("cities", {}).items():
                prev = prev_cities.get(city, {}).get("bb")
                jobs.append((city, "bb", item, prev))
            for city, item in cfg.get("citySightseeing", {}).get("cities", {}).items():
                prev = prev_cities.get(city, {}).get("cs")
                jobs.append((city, "cs", item, prev))

            # Conservative concurrency to avoid hammering the operators.
            sem = asyncio.Semaphore(3)

            async def run(job):
                city, op, item, prev = job
                async with sem:
                    data = await scrape_one(browser, op, city, item, stack_cfg, prev)
                    return city, op, data

            for city, op, data in await asyncio.gather(*(run(j) for j in jobs)):
                output["cities"].setdefault(city, {})[op] = data
        finally:
            await browser.close()

    OUTPUT_PATH.write_text(json.dumps(output, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    asyncio.run(main())
