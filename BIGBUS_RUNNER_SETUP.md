# Big Bus live-price runner setup

Big Bus currently returns Cloudflare 403 responses for product pages and product GraphQL queries from GitHub/Vercel cloud networks. The reliable design is therefore:

- City Sightseeing: GitHub-hosted runner, twice daily.
- Big Bus: a residential macOS ARM64 self-hosted runner, reading only the official Big Bus site.
- Both jobs merge into the same `prices.json`; neither job calls affiliate URLs.

## One-time setup on the always-on Apple Silicon Mac

1. Open this repository on GitHub.
2. Go to `Settings → Actions → Runners → New self-hosted runner`.
3. Select `macOS` and `ARM64`.
4. Run the download and configuration commands shown by GitHub on that Mac. Do not share the temporary registration token in chat or commit it anywhere.
5. During configuration, add the custom label `citytourbus-home`.
   - The runner should end up with these labels: `self-hosted`, `macOS`, `ARM64`, `citytourbus-home`.
6. Install the runner as a service using the service commands shown by GitHub (`svc.sh`) so it survives logout/reboot.
7. Keep the Mac connected to power and prevent automatic system sleep while on power.

## First verification

After the runner shows `Idle` in GitHub:

1. Open `Actions → Update Big Bus prices`.
2. Run the workflow on `audit/affiliate-seo-20261012`.
3. The workflow refuses to publish if zero fresh Big Bus prices are collected.
4. Verify `prices.json` contains Big Bus rows with `status: "ok"`, current `checkedAt`, `salePrice`, and, when available, `regularPrice` / `onsiteDiscountPercent`.

Only after this first successful residential run should the Big Bus workflow be changed from manual to twice-daily scheduling.

## Safety rules

- Never scrape through CJ affiliate redirect URLs; only official Big Bus source pages are used for price collection.
- A failed run keeps the last good price as `stale`; it does not replace it with an unverified number.
- Big Bus has no site-wide coupon in this implementation. City/ticket-specific official online sale prices and full prices are compared to calculate the current displayed discount.
- Displayed Big Bus values are official `from` / starting prices. The checkout amount can vary by date, ticket tier and party composition.
