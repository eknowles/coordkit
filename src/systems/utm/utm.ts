/**
 * UTM and UPS on WGS84.
 *
 * UTM uses the Krüger n-series (4th order, sub-millimetre inside a zone).
 * UPS uses the polar stereographic projection (Snyder, USGS PP 1395).
 */
import { DEG, RAD, WGS84, e, wrapLon, type LatLon } from "../../geo/ellipsoid";

const K0_UTM = 0.9996;
const K0_UPS = 0.994;
const FALSE_EASTING = 500_000;
const FALSE_NORTHING_SOUTH = 10_000_000;
const UPS_FALSE = 2_000_000;

export const LAT_BANDS = "CDEFGHJKLMNPQRSTUVWX";

const n = WGS84.f / (2 - WGS84.f);
const n2 = n * n;
const n3 = n2 * n;
const n4 = n3 * n;
const A = (WGS84.a / (1 + n)) * (1 + n2 / 4 + n4 / 64);

const alpha = [
  n / 2 - (2 * n2) / 3 + (5 * n3) / 16 + (41 * n4) / 180,
  (13 * n2) / 48 - (3 * n3) / 5 + (557 * n4) / 1440,
  (61 * n3) / 240 - (103 * n4) / 140,
  (49561 * n4) / 161280,
];
const beta = [
  n / 2 - (2 * n2) / 3 + (37 * n3) / 96 - n4 / 360,
  n2 / 48 + n3 / 15 - (437 * n4) / 1440,
  (17 * n3) / 480 - (37 * n4) / 840,
  (4397 * n4) / 161280,
];
const delta = [
  2 * n - (2 * n2) / 3 - 2 * n3 + (116 * n4) / 45,
  (7 * n2) / 3 - (8 * n3) / 5 - (227 * n4) / 45,
  (56 * n3) / 15 - (136 * n4) / 35,
  (4279 * n4) / 630,
];

export type Hemisphere = "N" | "S";

export interface Utm {
  zone: number;
  /** MGRS latitude band letter (C–X). */
  band: string;
  hemisphere: Hemisphere;
  easting: number;
  northing: number;
}

export interface Ups {
  hemisphere: Hemisphere;
  easting: number;
  northing: number;
}

/** Latitude band letter for -80 <= lat <= 84, or null outside UTM coverage. */
export function latBand(lat: number): string | null {
  if (lat < -80 || lat > 84) return null;
  const i = Math.min(19, Math.floor((lat + 80) / 8));
  return LAT_BANDS[i]!;
}

/** Southern latitude of a band letter. */
export function bandSouth(band: string): number {
  const i = LAT_BANDS.indexOf(band.toUpperCase());
  if (i < 0) throw new Error(`Invalid latitude band "${band}"`);
  return -80 + i * 8;
}

export function bandNorth(band: string): number {
  return band.toUpperCase() === "X" ? 84 : bandSouth(band) + 8;
}

/** UTM zone number, with the Norway and Svalbard exceptions. */
export function utmZone(lat: number, lon: number): number {
  lon = wrapLon(lon);
  let zone = Math.floor((lon + 180) / 6) + 1;
  if (zone > 60) zone = 60;
  if (lat >= 56 && lat < 64 && lon >= 3 && lon < 12) zone = 32;
  if (lat >= 72 && lat <= 84 && lon >= 0 && lon < 42) {
    if (lon < 9) zone = 31;
    else if (lon < 21) zone = 33;
    else if (lon < 33) zone = 35;
    else zone = 37;
  }
  return zone;
}

export function centralMeridian(zone: number): number {
  return (zone - 1) * 6 - 180 + 3;
}

/** Project to UTM. `forceZone` projects into a neighbouring zone. */
export function toUtm({ lat, lon }: LatLon, forceZone?: number): Utm {
  if (lat < -80 || lat > 84) throw new Error("Latitude outside UTM coverage (80°S to 84°N)");
  lon = wrapLon(lon);
  const zone = forceZone ?? utmZone(lat, lon);
  const phi = lat * DEG;
  let dLon = lon - centralMeridian(zone);
  if (dLon > 180) dLon -= 360;
  if (dLon < -180) dLon += 360;
  const lam = dLon * DEG;

  const sinPhi = Math.sin(phi);
  const t = Math.sinh(Math.atanh(sinPhi) - e * Math.atanh(e * sinPhi));
  const xiP = Math.atan2(t, Math.cos(lam));
  const etaP = Math.atanh(Math.sin(lam) / Math.sqrt(1 + t * t));

  let xi = xiP;
  let eta = etaP;
  for (let j = 1; j <= 4; j++) {
    const a = alpha[j - 1]!;
    xi += a * Math.sin(2 * j * xiP) * Math.cosh(2 * j * etaP);
    eta += a * Math.cos(2 * j * xiP) * Math.sinh(2 * j * etaP);
  }

  const easting = FALSE_EASTING + K0_UTM * A * eta;
  let northing = K0_UTM * A * xi;
  const hemisphere: Hemisphere = lat < 0 ? "S" : "N";
  if (hemisphere === "S") northing += FALSE_NORTHING_SOUTH;

  return { zone, band: latBand(lat)!, hemisphere, easting, northing };
}

export function fromUtm(zone: number, hemisphere: Hemisphere, easting: number, northing: number): LatLon {
  if (zone < 1 || zone > 60) throw new Error(`Invalid UTM zone ${zone}`);
  const xi = (northing - (hemisphere === "S" ? FALSE_NORTHING_SOUTH : 0)) / (K0_UTM * A);
  const eta = (easting - FALSE_EASTING) / (K0_UTM * A);

  let xiP = xi;
  let etaP = eta;
  for (let j = 1; j <= 4; j++) {
    const bj = beta[j - 1]!;
    xiP -= bj * Math.sin(2 * j * xi) * Math.cosh(2 * j * eta);
    etaP -= bj * Math.cos(2 * j * xi) * Math.sinh(2 * j * eta);
  }

  const chi = Math.asin(Math.sin(xiP) / Math.cosh(etaP));
  let phi = chi;
  for (let j = 1; j <= 4; j++) phi += delta[j - 1]! * Math.sin(2 * j * chi);
  const lam = Math.atan2(Math.sinh(etaP), Math.cos(xiP));

  return { lat: phi * RAD, lon: wrapLon(centralMeridian(zone) + lam * RAD) };
}

// Polar stereographic scale constant: sqrt((1+e)^(1+e) * (1-e)^(1-e)).
const UPS_C = Math.sqrt(Math.pow(1 + e, 1 + e) * Math.pow(1 - e, 1 - e));

export function toUps({ lat, lon }: LatLon): Ups {
  const hemisphere: Hemisphere = lat < 0 ? "S" : "N";
  const phi = Math.abs(lat) * DEG;
  const lam = wrapLon(lon) * DEG;
  const sinPhi = Math.sin(phi);
  const t = Math.tan(Math.PI / 4 - phi / 2) / Math.pow((1 - e * sinPhi) / (1 + e * sinPhi), e / 2);
  const rho = (2 * WGS84.a * K0_UPS * t) / UPS_C;
  const easting = UPS_FALSE + rho * Math.sin(lam);
  const northing = hemisphere === "N" ? UPS_FALSE - rho * Math.cos(lam) : UPS_FALSE + rho * Math.cos(lam);
  return { hemisphere, easting, northing };
}

export function fromUps(hemisphere: Hemisphere, easting: number, northing: number): LatLon {
  const dx = easting - UPS_FALSE;
  const dy = northing - UPS_FALSE;
  const rho = Math.hypot(dx, dy);
  const t = (rho * UPS_C) / (2 * WGS84.a * K0_UPS);
  let phi = Math.PI / 2 - 2 * Math.atan(t);
  for (let i = 0; i < 15; i++) {
    const s = e * Math.sin(phi);
    const next = Math.PI / 2 - 2 * Math.atan(t * Math.pow((1 - s) / (1 + s), e / 2));
    if (Math.abs(next - phi) < 1e-14) {
      phi = next;
      break;
    }
    phi = next;
  }
  const lam = hemisphere === "N" ? Math.atan2(dx, -dy) : Math.atan2(dx, dy);
  const lat = phi * RAD;
  return { lat: hemisphere === "N" ? lat : -lat, lon: rho === 0 ? 0 : lam * RAD };
}
