#!/usr/bin/env bash
# Builds the carousel's responsive variants and blur-up placeholders from the
# full-size originals in src/assets/carousel. Run it after adding or replacing
# a photo there. Needs cwebp (brew install webp).
#
#   npm run images
#
# Each photo gets:
#   - width variants next to the original (<name>-<width>.webp), picked by the
#     browser through srcset in src/home/Hero.tsx. Photos shown at the full
#     carousel width get 640 and 960; photos shown as half of a pair get 450
#     and 600. The original stays the largest candidate.
#   - a ~24px blurred copy in src/assets/placeholders, small enough for Vite to
#     inline as a data: URI, shown while the real photo loads.
set -euo pipefail
cd "$(dirname "$0")/.."

CAROUSEL=src/assets/carousel
PLACEHOLDERS=src/assets/placeholders
QUALITY=80

# name:widths. Widths come from how much of the 4:3 frame the photo covers.
FULL_WIDTH="windows-before windows-after brick-porch team"
HALF_WIDTH="lamp-before lamp-after pole-ground pole-cleaning"

variants() {
  local name=$1; shift
  for w in "$@"; do
    cwebp -quiet -q "$QUALITY" -resize "$w" 0 "$CAROUSEL/$name.webp" -o "$CAROUSEL/$name-$w.webp"
  done
}

placeholder() {
  local name=$1 w=$2
  cwebp -quiet -q 50 -resize "$w" 0 "$CAROUSEL/$name.webp" -o "$PLACEHOLDERS/$name.webp"
}

for name in $FULL_WIDTH; do
  variants "$name" 640 960
  placeholder "$name" 32
done

for name in $HALF_WIDTH; do
  variants "$name" 450 600
  placeholder "$name" 24
done

ls -l "$CAROUSEL"/*-[0-9]*.webp "$PLACEHOLDERS"/*.webp | awk '{printf "%7d  %s\n", $5, $9}'
