/** Latitude and longitude as decimal degrees, degrees-minutes-seconds and degrees-decimal-minutes. */
import { isValidLatLon, type LatLon } from "../../geo/ellipsoid";

export type AngleKind = "DD" | "DMS" | "DDM";

export function formatDD({ lat, lon }: LatLon, digits = 6): string {
  return `${lat.toFixed(digits)}, ${lon.toFixed(digits)}`;
}

function splitDMS(value: number, secDigits: number): [number, number, number] {
  const abs = Math.abs(value);
  let d = Math.floor(abs);
  let m = Math.floor((abs - d) * 60);
  let s = Number(((abs - d - m / 60) * 3600).toFixed(secDigits));
  if (s >= 60) {
    s = 0;
    m += 1;
  }
  if (m >= 60) {
    m = 0;
    d += 1;
  }
  return [d, m, s];
}

function hemi(value: number, axis: "lat" | "lon"): string {
  if (axis === "lat") return value < 0 ? "S" : "N";
  return value < 0 ? "W" : "E";
}

export function formatDMSValue(value: number, axis: "lat" | "lon", secDigits = 2): string {
  const [d, m, s] = splitDMS(value, secDigits);
  const pad = axis === "lat" ? 2 : 3;
  const sStr = s.toFixed(secDigits).padStart(secDigits ? secDigits + 3 : 2, "0");
  return `${String(d).padStart(pad, "0")}° ${String(m).padStart(2, "0")}′ ${sStr}″ ${hemi(value, axis)}`;
}

export function formatDMS(p: LatLon, secDigits = 2): string {
  return `${formatDMSValue(p.lat, "lat", secDigits)}, ${formatDMSValue(p.lon, "lon", secDigits)}`;
}

export function formatDDMValue(value: number, axis: "lat" | "lon", minDigits = 4): string {
  const abs = Math.abs(value);
  let d = Math.floor(abs);
  let m = Number(((abs - d) * 60).toFixed(minDigits));
  if (m >= 60) {
    m = 0;
    d += 1;
  }
  const pad = axis === "lat" ? 2 : 3;
  return `${String(d).padStart(pad, "0")}° ${m.toFixed(minDigits).padStart(minDigits + 3, "0")}′ ${hemi(value, axis)}`;
}

export function formatDDM(p: LatLon, minDigits = 4): string {
  return `${formatDDMValue(p.lat, "lat", minDigits)}, ${formatDDMValue(p.lon, "lon", minDigits)}`;
}

export interface LatLonParse {
  kind: AngleKind;
  point: LatLon;
}

const NUM = String.raw`[-+]?\d+(?:\.\d+)?`;

/** Parse one angle, e.g. `51°30'26.5"N`, `51 30.441 N`, `-0.1278`, `W 0 7 40`. */
function parseAngle(raw: string, axis: "lat" | "lon"): { value: number; kind: AngleKind } | null {
  let s = raw.trim().toUpperCase();
  let sign = 1;
  const hemiRe = axis === "lat" ? /[NS]/ : /[EW]/;
  const hm = s.match(hemiRe);
  if (hm) {
    if (hm[0] === "S" || hm[0] === "W") sign = -1;
    s = s.replace(hemiRe, " ");
  }
  if (/[A-Z]/.test(s)) return null;
  const nums = s.match(new RegExp(NUM, "g"))?.map(Number);
  if (!nums || nums.length === 0 || nums.length > 3) return null;
  if (nums[0]! < 0) {
    sign = -sign;
    nums[0] = -nums[0]!;
  }
  const [d, m = 0, sec = 0] = nums;
  if (m < 0 || m >= 60 || sec < 0 || sec >= 60) return null;
  const kind: AngleKind = nums.length === 1 ? "DD" : nums.length === 2 ? "DDM" : "DMS";
  return { value: sign * (d! + m / 60 + sec / 3600), kind };
}

export function parseLatLon(input: string): LatLonParse | null {
  const s = input.trim().toUpperCase();
  let latStr: string | undefined;
  let lonStr: string | undefined;

  // "51 30 N 0 7 W" style: split after the first hemisphere letter.
  const hemi = /^[NS]/.test(s)
    ? /^([NS][^EW]*?)\s*[,;]?\s*([EW].*)$/.exec(s)
    : /^(.*?[NS])\s*[,;]?\s*(.*[EW].*)$/.exec(s);
  if (hemi) {
    latStr = hemi[1];
    lonStr = hemi[2];
  } else if (/[,;]/.test(s)) {
    const parts = s.split(/\s*[;,]\s*(?=[-+\dNSEW])/);
    if (parts.length === 2) [latStr, lonStr] = parts;
  } else {
    const nums = s.split(/\s+/);
    if (nums.length === 2) [latStr, lonStr] = nums;
  }
  if (!latStr || !lonStr) return null;
  const lat = parseAngle(latStr, "lat");
  const lon = parseAngle(lonStr, "lon");
  if (!lat || !lon) return null;
  const point = { lat: lat.value, lon: lon.value };
  if (!isValidLatLon(point)) return null;
  const rank: Record<AngleKind, number> = { DD: 0, DDM: 1, DMS: 2 };
  return { kind: rank[lat.kind] >= rank[lon.kind] ? lat.kind : lon.kind, point };
}
