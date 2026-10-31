#!/bin/sh
# Builds keyword pages, then renders their card images (macOS: needs swiftc).
# Usage (from repo root): sh scripts/keyword-pages/make-cards.sh
set -e
DIR="scripts/keyword-pages"
node "$DIR/build.mjs"
node "$DIR/link_home.mjs"
mkdir -p "$DIR/.cache"
cat "$DIR/landmarks.swift" "$DIR/cards.swift" > "$DIR/.cache/main.swift"
swiftc -O "$DIR/.cache/main.swift" -o "$DIR/.cache/cards"
"$DIR/.cache/cards" "$DIR/.cache/cards.json" .
# English/Japanese pages (data/i18n) and their localized hero/og cards
node scripts/i18n/build_i18n.mjs
mkdir -p img/en img/ja
"$DIR/.cache/cards" scripts/i18n/.cache/cards.json .
