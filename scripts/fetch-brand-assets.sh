#!/bin/sh
# ─────────────────────────────────────────────────────────────────────────────
# Fetch the brand fonts + logos from the (still-live) Manus deployment into
# this repo, so the app has ZERO runtime dependency on Manus storage.
#
# Run this ONCE from the repo root on any machine with open internet access,
# then commit the downloaded files:
#
#   sh scripts/fetch-brand-assets.sh
#   git add client/public/fonts client/public/images
#   git commit -m "Vendor brand fonts and logos"
#
# IMPORTANT: do this while the old Manus deployment is still online — once
# that project is deleted these files are unrecoverable from this URL.
# ─────────────────────────────────────────────────────────────────────────────
set -e

BASE="${MANUS_APP_URL:-https://arash-teleapp-7shs2egu.manus.space}/manus-storage"

mkdir -p client/public/fonts client/public/images

fetch() {
  dest="$1"
  file="$2"
  if [ -s "$dest/$file" ]; then
    echo "skip  $file (already exists)"
    return 0
  fi
  echo "fetch $file"
  curl -fL --retry 3 --max-time 120 -o "$dest/$file" "$BASE/$file"
}

fetch client/public/fonts  Pelak-Bold_c6d514e8.woff2
fetch client/public/fonts  Pelak-ExtraBold_d276833a.woff2
fetch client/public/fonts  Pelak-Black_09ef6ce9.woff2

fetch client/public/images mark-white_d3b7a24a.png
fetch client/public/images logotype-gold_c20a9ae8.png
fetch client/public/images logo-circle-dark_9f5eb9e0.jpeg

echo ""
echo "Done. Now commit the files:"
echo "  git add client/public/fonts client/public/images && git commit -m 'Vendor brand fonts and logos'"
