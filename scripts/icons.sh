#!/usr/bin/env bash
# Render the app icons from public/logo.svg. Needs rsvg-convert (librsvg) and python3.
# The PNGs are committed, so only run this after changing the logo.
set -euo pipefail

cd "$(dirname "$0")/.."
src=public/logo.svg
out=public
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT

background='#111113'
inner=$(sed -e '1d' -e '$d' "$src")

# Full-bleed square, for iOS (it rounds the corners itself).
printf '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="%s"/>%s</svg>' \
  "$background" "$inner" > "$tmp/square.svg"

# Maskable: full bleed with the artwork inside the central 80% safe zone.
printf '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="%s"/><g transform="translate(51.2 51.2) scale(0.8)">%s</g></svg>' \
  "$background" "$inner" > "$tmp/maskable.svg"

cp "$src" "$out/favicon.svg"
rsvg-convert -w 192 -h 192 "$src" -o "$out/pwa-192x192.png"
rsvg-convert -w 512 -h 512 "$src" -o "$out/pwa-512x512.png"
rsvg-convert -w 512 -h 512 "$tmp/maskable.svg" -o "$out/maskable-icon-512x512.png"
rsvg-convert -w 180 -h 180 "$tmp/square.svg" -o "$out/apple-touch-icon-180x180.png"
for size in 16 32 48; do
  rsvg-convert -w "$size" -h "$size" "$src" -o "$tmp/favicon-$size.png"
done

# favicon.ico holding PNG images (supported by every current browser).
python3 - "$tmp" "$out/favicon.ico" <<'PY'
import struct, sys
tmp, target = sys.argv[1], sys.argv[2]
images = [open(f"{tmp}/favicon-{size}.png", "rb").read() for size in (16, 32, 48)]
header = struct.pack("<HHH", 0, 1, len(images))
offset = 6 + 16 * len(images)
entries, data = b"", b""
for size, png in zip((16, 32, 48), images):
    entries += struct.pack("<BBBBHHII", size, size, 0, 0, 1, 32, len(png), offset + len(data))
    data += png
open(target, "wb").write(header + entries + data)
PY

echo "Icons written to $out/"
