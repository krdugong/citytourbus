#!/usr/bin/env python3
import argparse
import asyncio
import json
from copy import deepcopy

import update_prices as core


def parse_args():
    p = argparse.ArgumentParser(description="Refresh one tour operator while preserving the other operator's last good data.")
    p.add_argument("--operator", choices=("cs", "bb"), required=True)
    return p.parse_args()


async def refresh(operator):
    cfg = core.load_json(core.CONFIG_PATH, {})
    stack_cfg = core.load_json(core.STACK_PATH, {"cities": {}}).get("cities", {})
    previous = core.load_json(core.OUTPUT_PATH, {"schemaVersion": 1, "cities": {}})
    prev_cities = previous.get("cities", {})

    output = deepcopy(previous) if isinstance(previous, dict) else {}
    output["schemaVersion"] = 1
    output["generatedAt"] = core.now_iso()
    output["note"] = (
        "Prices are collected only from operators' official pages. "
        "Affiliate URLs are never called by the price collector. "
        "Operator refreshes are merged so a failed or separate run never erases the other operator's data."
    )
    output.setdefault("cities", {})

    section = "citySightseeing" if operator == "cs" else "bigBus"
    items = cfg.get(section, {}).get("cities", {})
    if not items:
        raise RuntimeError(f"No configured cities for {operator}")

    async with core.async_playwright() as p:
        browser = await p.chromium.launch(headless=True, args=["--no-sandbox"])
        try:
            sem = asyncio.Semaphore(3)

            async def run(city, item):
                prev = prev_cities.get(city, {}).get(operator)
                async with sem:
                    data = await core.scrape_one(browser, operator, city, item, stack_cfg, prev)
                    return city, data

            results = await asyncio.gather(*(run(city, item) for city, item in items.items()))
            for city, data in results:
                output["cities"].setdefault(city, {})[operator] = data
        finally:
            await browser.close()

    core.OUTPUT_PATH.write_text(json.dumps(output, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    ok = stale = error = 0
    for city in items:
        status = output["cities"].get(city, {}).get(operator, {}).get("status")
        if status == "ok":
            ok += 1
        elif status == "stale":
            stale += 1
        else:
            error += 1
    print(f"{operator}: ok={ok} stale={stale} error={error}")


if __name__ == "__main__":
    args = parse_args()
    asyncio.run(refresh(args.operator))
