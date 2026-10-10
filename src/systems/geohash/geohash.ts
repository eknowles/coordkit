/** Geohash: base-32 interleaved latitude and longitude bits. */
import type { LatLon } from "../../geo/ellipsoid";

const GH32 = "0123456789bcdefghjkmnpqrstuvwxyz";

export function toGeohash({ lat, lon }: LatLon, length = 10): string {
  let latR = [-90, 90];
  let lonR = [-180, 180];
  let out = "";
  let bits = 0;
  let ch = 0;
  let even = true;
  while (out.length < length) {
    const r = even ? lonR : latR;
    const v = even ? lon : lat;
    const mid = (r[0]! + r[1]!) / 2;
    ch <<= 1;
    if (v >= mid) {
      ch |= 1;
      r[0] = mid;
    } else r[1] = mid;
    even = !even;
    if (++bits === 5) {
      out += GH32[ch];
      bits = 0;
      ch = 0;
    }
  }
  return out;
}

export function isGeohash(s: string): boolean {
  return /^[0-9b-hjkmnp-z]{1,12}$/.test(s.toLowerCase());
}

export function fromGeohash(hash: string): { center: LatLon; west: number; south: number; east: number; north: number } {
  const latR = [-90, 90];
  const lonR = [-180, 180];
  let even = true;
  for (const c of hash.toLowerCase()) {
    const idx = GH32.indexOf(c);
    if (idx < 0) throw new Error(`Invalid geohash character "${c}"`);
    for (let bit = 4; bit >= 0; bit--) {
      const r = even ? lonR : latR;
      const mid = (r[0]! + r[1]!) / 2;
      if ((idx >> bit) & 1) r[0] = mid;
      else r[1] = mid;
      even = !even;
    }
  }
  return {
    center: { lat: (latR[0]! + latR[1]!) / 2, lon: (lonR[0]! + lonR[1]!) / 2 },
    west: lonR[0]!,
    south: latR[0]!,
    east: lonR[1]!,
    north: latR[1]!,
  };
}
