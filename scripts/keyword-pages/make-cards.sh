#!/bin/sh
# Builds keyword pages, then renders their card images (macOS: needs swiftc).
# Usage (from repo root): sh scripts/keyword-pages/make-cards.sh
set -e
DIR="scripts/keyword-pages"
node "$DIR/build.mjs"
node "$DIR/link_home.mjs"
swiftc -O "$DIR/cards.swift" -o "$DIR/.cache/cards"
"$DIR/.cache/cards" "$DIR/.cache/cards.json" .
