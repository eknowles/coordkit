/**
 * Military Grid Reference System (MGRS), including the UPS polar areas.
 * Lettering follows NGA TM 8358.1 / GEOTRANS.
 */
import type { LatLon } from "../../geo/ellipsoid";
import { LAT_BANDS, bandNorth, bandSouth, fromUps, fromUtm, toUps, toUtm, centralMeridian } from "../utm/utm";

const COL_SETS = ["ABCDEFGH", "JKLMNPQR", "STUVWXYZ"];
const ROW_LETTERS = "ABCDEFGHJKLMNPQRSTUV";
const UPS_ROWS = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const UPS_COLS_WEST = "JKLPQRSTUXYZ";
const UPS_COLS_EAST = "ABCFGHJKLPQR";

/** Digits per axis: 5 = 1 m, 4 = 10 m, 3 = 100 m, 2 = 1 km, 1 = 10 km, 0 = 100 km. */
export type MgrsPrecision = 0 | 1 | 2 | 3 | 4 | 5;

export interface MgrsParts {
  zone: number | null; // null for UPS
  band: string;
  square: string;
  easting: string;
  northing: string;
}

/** 100 km square letters for a UTM coordinate. */
export function utmSquareId(zone: number, easting: number, northing: number): string {
  const set = COL_SETS[(zone - 1) % 3]!;
  const col = set[Math.floor(easting / 100_000) - 1] ?? "?";
  const rowOffset = zone % 2 === 0 ? 5 : 0;
  const rowIdx = (Math.floor((northing % 2_000_000) / 100_000) + rowOffset) % 20;
  return col + ROW_LETTERS[rowIdx]!;
}

function truncDigits(value: number, precision: MgrsPrecision): string {
  if (precision === 0) return "";
  // Truncate (never round) to the requested resolution, as MGRS requires.
  const v = Math.floor((value % 100_000) / Math.pow(10, 5 - precision) + 1e-9);
  return String(v).padStart(precision, "0");
}

export function toMgrsParts(p: LatLon, precision: MgrsPrecision = 5): MgrsParts {
  if (p.lat > 84 || p.lat < -80) {
    const ups = toUps(p);
    const west = p.lon < 0;
    const band = ups.hemisphere === "N" ? (west ? "Y" : "Z") : west ? "A" : "B";
    const fe = west ? 800_000 : 2_000_000;
    const fn = ups.hemisphere === "N" ? 1_300_000 : 800_000;
    const cols = west ? UPS_COLS_WEST : UPS_COLS_EAST;
    const col = cols[Math.floor((ups.easting - fe) / 100_000)] ?? "?";
    const row = UPS_ROWS[Math.floor((ups.northing - fn) / 100_000)] ?? "?";
    return {
      zone: null,
      band,
      square: col + row,
      easting: truncDigits(ups.easting, precision),
      northing: truncDigits(ups.northing, precision),
    };
  }
  const u = toUtm(p);
  return {
    zone: u.zone,
    band: u.band,
    square: utmSquareId(u.zone, u.easting, u.northing),
    easting: truncDigits(u.easting, precision),
    northing: truncDigits(u.northing, precision),
  };
}

export function toMgrs(p: LatLon, precision: MgrsPrecision = 5, spaced = false): string {
  const m = toMgrsParts(p, precision);
  const gzd = (m.zone ?? "") + m.band;
  const parts = [gzd, m.square, m.easting, m.northing].filter(Boolean);
  return spaced ? parts.join(" ") : parts.join("");
}

const MGRS_RE = /^(\d{1,2})?([A-HJ-NP-Z])([A-HJ-NP-Z]{2})(\d*)$/;

export function isMgrs(s: string): boolean {
  const m = MGRS_RE.exec(s.replace(/\s+/g, "").toUpperCase());
  return !!m && m[4]!.length % 2 === 0 && m[4]!.length <= 10;
}

export interface MgrsDecoded {
  /** South-west corner of the referenced square. */
  sw: LatLon;
  /** Centre of the referenced square. */
  center: LatLon;
  /** Square size in metres. */
  size: number;
}

/** Decode an MGRS string. */
export function fromMgrs(input: string): MgrsDecoded {
  const s = input.replace(/\s+/g, "").toUpperCase();
  const m = MGRS_RE.exec(s);
  if (!m) throw new Error(`Invalid MGRS "${input}"`);
  const [, zoneStr, band, sq, digits] = m as unknown as [string, string | undefined, string, string, string];
  if (digits.length % 2 !== 0 || digits.length > 10) throw new Error("MGRS needs an even number of digits (max 10)");
  const precision = digits.length / 2;
  const size = Math.pow(10, 5 - precision);
  const e100 = precision ? Number(digits.slice(0, precision)) * size : 0;
  const n100 = precision ? Number(digits.slice(precision)) * size : 0;

  const at = (de: number, dn: number): LatLon => decodeAt(zoneStr, band, sq, e100 + de, n100 + dn);
  return { sw: at(0, 0), center: at(size / 2, size / 2), size };
}

function decodeAt(zoneStr: string | undefined, band: string, sq: string, e100: number, n100: number): LatLon {
  const col = sq[0]!;
  const row = sq[1]!;

  if (!zoneStr) {
    if (!"ABYZ".includes(band)) throw new Error("A grid zone number is required outside the polar areas");
    const west = band === "A" || band === "Y";
    const north = band === "Y" || band === "Z";
    const cols = west ? UPS_COLS_WEST : UPS_COLS_EAST;
    const ci = cols.indexOf(col);
    const ri = UPS_ROWS.indexOf(row);
    if (ci < 0 || ri < 0) throw new Error(`Invalid UPS 100 km square "${sq}"`);
    const fe = west ? 800_000 : 2_000_000;
    const fn = north ? 1_300_000 : 800_000;
    return fromUps(north ? "N" : "S", fe + ci * 100_000 + e100, fn + ri * 100_000 + n100);
  }

  const zone = Number(zoneStr);
  if (zone < 1 || zone > 60) throw new Error(`Invalid grid zone ${zone}`);
  if (!LAT_BANDS.includes(band)) throw new Error(`Invalid latitude band "${band}"`);

  const set = COL_SETS[(zone - 1) % 3]!;
  const ci = set.indexOf(col);
  if (ci < 0) throw new Error(`Column letter "${col}" is not valid in zone ${zone}`);
  const rowOffset = zone % 2 === 0 ? 5 : 0;
  const ri = ROW_LETTERS.indexOf(row);
  if (ri < 0) throw new Error(`Invalid row letter "${row}"`);

  const easting = (ci + 1) * 100_000 + e100;
  const rowNorthing = (((ri - rowOffset) % 20) + 20) % 20 * 100_000 + n100;

  const hemisphere = band >= "N" ? "N" : "S";
  // Resolve the 2,000 km row cycle from the latitude band.
  const south = bandSouth(band);
  const bandMin = toUtm({ lat: south, lon: centralMeridian(zone) }, zone).northing;
  let northing = rowNorthing;
  while (northing < bandMin - 100_000) northing += 2_000_000;

  const p = fromUtm(zone, hemisphere, easting, northing);
  if (p.lat < south - 0.5 || p.lat > bandNorth(band) + 0.5) {
    throw new Error(`Square ${sq} does not fall in band ${band}`);
  }
  return p;
}
