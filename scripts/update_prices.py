#!/usr/bin/env python3
import asyncio
import html
import json
import re
from datetime import datetime, timezone
from pathlib import Path
from urllib.request import Request, urlopen

from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parents[1]
CONFIG_PATH = ROOT / "data" / "price-sources.json"
STACK_PATH = ROOT / "data" / "city-sightseeing-stack.json"
OUTPUT_PATH = ROOT / "prices.json"

MONEY_RE = re.compile(
    r"(?P<currency>AED|AU\$|A\$|CA\$|C\$|US\$|NZ\$|HK\$|SG\$|£|€|\$|¥|JPY|GBP|EUR|USD)\s*(?P<amount>\d{1,5}(?:[.,]\d{1,2})?)",
    re.I,
)
PERCENT_RE = re.compile(r"(?:-|save\s+|up\s+to\s+|save\s+over\s+)?(?P<pct>\d{1,2})\s*%", re.I)
BIG_BUS_TICKET_MARKERS = (
    "one day ticket",
    "discover ticket",
    "essential ticket",
    "explore ticket",
    "classic ticket",
    "premium ticket",
    "deluxe ticket",
    "1 day ticket",
    "1-day ticket",
    "24 hour ticket",
    "24-hour ticket",
    "48 hour ticket",
    "48-hour ticket",
    "72 hour ticket",
    "72-hour ticket",
)


def now_iso():
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def load_json(path, default):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return default


def normalize_lines(text):
    return [re.sub(r"\s+", " ", line).strip() for line in text.splitlines() if line.strip()]


def html_to_text(raw):
    raw = re.sub(r"(?is)<script[^>]*>.*?</script>", " ", raw)
    raw = re.sub(r"(?is)<style[^>]*>.*?</style>", " ", raw)
    raw = re.sub(r"(?i)<br\s*/?>", "\n", raw)
    raw = re.sub(r"(?i)</(?:div|p|li|h[1-6]|section|article|tr|td|span|a)>", "\n", raw)
    raw = re.sub(r"(?s)<[^>]+>", " ", raw)
    return html.unescape(raw)


def money_matches(line):
    out = []
    for m in MONEY_RE.finditer(line):
        amount = float(m.group("amount").replace(",", "."))
        if amount > 0:
            out.append((m.group("currency").upper(), amount))
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
    valid = []
    for c in candidates:
        sale = c.get("salePrice")
        if sale is None or sale <= 0:
            continue
        regular = c.get("regularPrice")
        if regular is not None and regular < sale:
            continue
        valid.append(c)
    if not valid:
        return None
    return sorted(valid, key=lambda c: (c["salePrice"], c.get("regularPrice") or 10**9))[0]


def build_candidate(currency, sale, regular=None, explicit_pct=None, label=None):
    if sale is None or sale <= 0:
        return None
    calc_pct = None
    if regular and regular > sale:
        calc_pct = round((1 - sale / regular) * 100)
    # Actual price difference is more reliable than a marketing "up to X%" badge.
    onsite_pct = calc_pct or explicit_pct
    return {
        "currency": currency,
        "salePrice": round(float(sale), 2),
        "regularPrice": round(float(regular), 2) if regular else None,
        "onsiteDiscountPercent": onsite_pct,
        "label": label,
    }


def candidate_from_price_lines(lines, price_idx, label_idx=None):
    first = money_matches(lines[price_idx])
    if not first:
        return None
    currency, first_amount = first[0]
    amounts = [first_amount]
    for idx in range(price_idx + 1, min(len(lines), price_idx + 5)):
        for cur, amount in money_matches(lines[idx]):
            if cur == currency:
                amounts.append(amount)
    amounts = amounts[:3]
    sale = min(amounts)
    regular = max(amounts) if len(amounts) >= 2 and max(amounts) > sale else None
    explicit_pct = pct_near(lines, (label_idx if label_idx is not None else price_idx) - 5, price_idx + 3)
    return build_candidate(
        currency,
        sale,
        regular=regular,
        explicit_pct=explicit_pct,
        label=lines[label_idx] if label_idx is not None else None,
    )


def extract_city_sightseeing(text):
    lines = normalize_lines(text)
    candidates = []

    # City Sightseeing destination pages put the pure bus product type before its From price.
    # Example: -10% / Bus / ... / From / $38.92 / $35.03.
    for i, line in enumerate(lines):
        low = line.lower().strip()
        is_bus_product = low == "bus" or (low.startswith("bus (") and "+" not in low)
        if not is_bus_product:
            continue
        for j in range(i + 1, min(len(lines), i + 28)):
            jlow = lines[j].lower().strip()
            if jlow == "from" or jlow.startswith("from "):
                # Price often sits on the next line, but sometimes on the From line itself.
                if money_matches(lines[j]):
                    cand = candidate_from_price_lines(lines, j, i)
                elif j + 1 < len(lines):
                    cand = candidate_from_price_lines(lines, j + 1, i)
                else:
                    cand = None
                if cand:
                    candidates.append(cand)
                break

    # Fallback for product/detail layouts where the product-type label is absent.
    if not candidates:
        bus_terms = ("hop-on hop-off", "hop on hop off", "bus tour", "panoramic")
        exclude_terms = ("museum", "cruise", "boat", "aquarium", "oceanarium", "stadium", "flamenco", "walking tour")
        for i, line in enumerate(lines):
            low = line.lower()
            if not any(term in low for term in bus_terms):
                continue
            if any(term in low for term in exclude_terms) or "+" in line:
                continue
            for j in range(max(0, i - 18), min(len(lines), i + 18)):
                jlow = lines[j].lower().strip()
                if jlow == "from" or jlow.startswith("from "):
                    price_idx = j if money_matches(lines[j]) else j + 1
                    if price_idx < len(lines):
                        cand = candidate_from_price_lines(lines, price_idx, i)
                        if cand:
                            candidates.append(cand)
                    break

    return choose_candidate(candidates)


def extract_big_bus(text):
    lines = normalize_lines(text)
    candidates = []

    # Only accept prices attached to known hop-on-hop-off ticket names. This prevents
    # unrelated "$10 off" marketing copy or attraction prices from becoming the city price.
    for i, line in enumerate(lines):
        low = line.lower().strip()
        if not any(marker in low for marker in BIG_BUS_TICKET_MARKERS):
            continue

        sale_currency = None
        sale = None
        regular = None
        for j in range(i + 1, min(len(lines), i + 14)):
            jlow = lines[j].lower()
            matches = money_matches(lines[j])
            if not matches:
                continue
            if sale is None and ("adult from" in jlow or jlow.startswith("from ") or jlow == "from"):
                sale_currency, sale = matches[0]
                continue
            if sale is not None and "full price" in jlow:
                cur, value = matches[0]
                if cur == sale_currency and value > sale:
                    regular = value
                break

        if sale is not None:
            explicit_pct = pct_near(lines, i - 5, i + 3)
            cand = build_candidate(sale_currency, sale, regular, explicit_pct, line)
            if cand:
                candidates.append(cand)

    return choose_candidate(candidates)


def effective_discount(onsite_pct, code_pct):
    if not onsite_pct or not code_pct:
        return None
    return round((1 - (1 - onsite_pct / 100) * (1 - code_pct / 100)) * 100, 1)


def code_price(price, code_pct):
    if not price or not code_pct:
        return None
    return round(price * (1 - code_pct / 100), 2)


def get_static_text_sync(url):
    req = Request(
        url,
        headers={
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131 Safari/537.36",
            "Accept-Language": "en-GB,en;q=0.9",
            "Accept": "text/html,application/xhtml+xml",
        },
    )
    with urlopen(req, timeout=35) as resp:
        charset = resp.headers.get_content_charset() or "utf-8"
        raw = resp.read().decode(charset, errors="replace")
    return html_to_text(raw)


async def get_static_text(url):
    return await asyncio.to_thread(get_static_text_sync, url)


async def get_page_text(browser, url):
    page = await browser.new_page(
        locale="en-GB",
        user_agent=(
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
            "(KHTML, like Gecko) Chrome/131.0 Safari/537.36"
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
        await page.wait_for_timeout(2500)
        return await page.locator("body").inner_text(timeout=15000)
    finally:
        await page.close()


async def scrape_one(browser, operator, city, item, stack_overrides, previous):
    checked = now_iso()
    prev = previous or {}
    try:
        parsed = None
        # Big Bus publishes ticket prices in server-rendered HTML on many city pages.
        # Prefer that path because it is both lighter and less prone to geolocation UI noise.
        if operator == "bb":
            try:
                static_text = await get_static_text(item["source"])
                parsed = extract_big_bus(static_text)
            except Exception:
                parsed = None

        if not parsed:
            text = await get_page_text(browser, item["source"])
            parsed = extract_city_sightseeing(text) if operator == "cs" else extract_big_bus(text)

        if not parsed:
            raise RuntimeError("No plausible bus price found")

        # Sanity guard against common false positives such as "$10 off" copy.
        if operator == "bb" and parsed["salePrice"] < 15:
            raise RuntimeError(f"Rejected implausibly low Big Bus price: {parsed['salePrice']}")

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
        if prev and prev.get("status") in ("ok", "stale") and prev.get("lastSuccessAt"):
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
