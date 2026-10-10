/** Maidenhead locator (amateur radio grid squares). */
import type { LatLon } from "../../geo/ellipsoid";

export function toMaidenhead({ lat, lon }: LatLon, pairs = 4): string {
  let x = Math.min(359.9999999, lon + 180);
  let y = Math.min(179.9999999, lat + 90);
  let out = "";
  const sizes: [number, number, string][] = [
    [20, 10, "A"],
    [2, 1, "0"],
    [5 / 60, 2.5 / 60, "a"],
    [0.5 / 60, 0.25 / 60, "0"],
  ];
  for (let i = 0; i < pairs && i < sizes.length; i++) {
    const [w, h, base] = sizes[i]!;
    const cx = Math.floor(x / w);
    const cy = Math.floor(y / h);
    const code = base.charCodeAt(0);
    out += String.fromCharCode(code + cx) + String.fromCharCode(code + cy);
    x -= cx * w;
    y -= cy * h;
  }
  return out;
}

export function isMaidenhead(s: string): boolean {
  return /^[A-R]{2}(\d{2}([A-X]{2}(\d{2})?)?)?$/i.test(s);
}

export function fromMaidenhead(loc: string): { center: LatLon; west: number; south: number; east: number; north: number } {
  const s = loc.toUpperCase();
  if (!isMaidenhead(s)) throw new Error(`Invalid Maidenhead locator "${loc}"`);
  const sizes: [number, number, string][] = [
    [20, 10, "A"],
    [2, 1, "0"],
    [5 / 60, 2.5 / 60, "A"],
    [0.5 / 60, 0.25 / 60, "0"],
  ];
  let west = -180;
  let south = -90;
  let w = 360;
  let h = 180;
  for (let i = 0; i < s.length / 2; i++) {
    const [sw, sh, base] = sizes[i]!;
    west += (s.charCodeAt(i * 2) - base.charCodeAt(0)) * sw;
    south += (s.charCodeAt(i * 2 + 1) - base.charCodeAt(0)) * sh;
    w = sw;
    h = sh;
  }
  return { center: { lat: south + h / 2, lon: west + w / 2 }, west, south, east: west + w, north: south + h };
}
