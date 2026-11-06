#!/bin/sh
# Monthly refresh: moves Korean page month labels to the current month, rebuilds,
# re-renders only the main/og cards whose label changed (Korean, English, Japanese), then validates.
# Usage (repo root, macOS): sh scripts/keyword-pages/bump-month.sh [YYYY-MM-DD]
set -e
DIR="scripts/keyword-pages"
mkdir -p "$DIR/.cache"
python3 -I "$DIR/bump_month.py" "$@" > "$DIR/.cache/bumped.txt"
echo "pages changed: $(wc -l < "$DIR/.cache/bumped.txt" | tr -d ' ')"
[ -s "$DIR/.cache/bumped.txt" ] || exit 0
node "$DIR/build.mjs" > /dev/null
node scripts/i18n/build_i18n.mjs > /dev/null
python3 -I - "$DIR" <<'PY'
import json, sys
d = sys.argv[1]
slugs = set(open(f'{d}/.cache/bumped.txt').read().split())
specs = [s for s in json.load(open(f'{d}/.cache/cards.json'))
         if s['out'].split('/')[1] in slugs and s['eyebrow'].endswith('업데이트')]
# English/Japanese pages: their hero eyebrow follows the Korean updated date, so rebuild them all
# and redraw the cards of the ones whose eyebrow moved (en/<slug>, ja/<slug> in bumped.txt).
specs += [s for s in json.load(open('scripts/i18n/.cache/cards.json'))
          if '/'.join(s['out'].split('/')[1:3]).rsplit('-', 1)[0] in slugs]
json.dump(specs, open(f'{d}/.cache/cards-new.json', 'w'), ensure_ascii=False)
print('cards to render:', len(specs))
PY
if [ ! -x "$DIR/.cache/cards" ]; then
  cat "$DIR/landmarks.swift" "$DIR/cards.swift" > "$DIR/.cache/main.swift"
  swiftc -O "$DIR/.cache/main.swift" -o "$DIR/.cache/cards"
fi
"$DIR/.cache/cards" "$DIR/.cache/cards-new.json" . > /dev/null
node "$DIR/link_home.mjs" > /dev/null
node scripts/head_tweaks.mjs > /dev/null
node scripts/add_analytics.mjs > /dev/null
python3 -I "$DIR/validate.py"
