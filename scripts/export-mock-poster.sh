#!/usr/bin/env bash
# Export 14 June mock poster PNGs from HTML using headless Chrome.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HTML="$ROOT/outreach/assets/14-june-mock-poster.html"
OUT_DIR="$ROOT/outreach/assets"
SQUARE="$OUT_DIR/14-june-mock-poster.png"
STORY="$OUT_DIR/14-june-mock-poster-story.png"

CHROME=""
for c in google-chrome google-chrome-stable chromium chromium-browser; do
  if command -v "$c" >/dev/null 2>&1; then
    CHROME="$c"
    break
  fi
done

if [[ -z "$CHROME" ]]; then
  echo "No Chrome/Chromium found. Open $HTML in browser and screenshot manually."
  exit 1
fi

file_url="file://$HTML"

# Square poster (1080x1080) — first .poster element
"$CHROME" --headless=new --disable-gpu --window-size=1200,1200 \
  --screenshot="$SQUARE" \
  --default-background-color=0 \
  "$file_url" 2>/dev/null || true

echo "Exported: $SQUARE"
echo "For story (1080x1920): open $HTML in browser, screenshot the story panel, save as $STORY"
