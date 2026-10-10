import type { LatLon } from '../../geo/ellipsoid'
import {
  LAT_BANDS,
  bandNorth,
  bandSouth,
  centralMeridian,
  fromUps,
  fromUtm,
  toUps,
  toUtm,
} from '../utm/utm'
/**
 * Military Grid Reference System (MGRS), including the UPS polar areas.
 * Lettering follows NGA TM 8358.1 / GEOTRANS.
 */
import type { MgrsPrecision } from './precision'

const COL_SETS = ['ABCDEFGH', 'JKLMNPQR', 'STUVWXYZ']
const ROW_LETTERS = 'ABCDEFGHJKLMNPQRSTUV'
const UPS_ROWS = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
const UPS_COLS_WEST = 'JKLPQRSTUXYZ'
const UPS_COLS_EAST = 'ABCFGHJKLPQR'

export interface MgrsParts {
  zone: number | null // null for UPS
  band: string
  square: string
  easting: string
  northing: string
}

/** 100 km square letters for a UTM coordinate. */
export function utmSquareId(
  zone: number,
  easting: number,
  northing: number,
): string {
  const set = COL_SETS[(zone - 1) % 3]!
  const col = set[Math.floor(easting / 100_000) - 1] ?? '?'
  const rowOffset = zone % 2 === 0 ? 5 : 0
  const rowIdx = (Math.floor((northing % 2_000_000) / 100_000) + rowOffset) % 20
  return col + ROW_LETTERS[rowIdx]!
}

/**
 * Truncate to whole metres, allowing for float error just below a whole metre. The square
 * letters and the digits both come from this value, so 99,999.9999 m cannot give the digits of
 * the next square inside the letters of this one.
 */
function toWholeMetres(value: number): number {
  return Math.floor(value + 1e-6)
}

/** Truncate (never round) whole metres to the requested resolution, as MGRS requires. */
function truncDigits(metres: number, precision: MgrsPrecision): string {
  if (precision === 0) return ''
  const v = Math.floor((metres % 100_000) / Math.pow(10, 5 - precision))
  return String(v).padStart(precision, '0')
}

export function toMgrsParts(
  p: LatLon,
  precision: MgrsPrecision = 5,
): MgrsParts {
  if (p.lat > 84 || p.lat < -80) {
    const ups = toUps(p)
    const easting = toWholeMetres(ups.easting)
    const northing = toWholeMetres(ups.northing)
    // The polar zones split at easting 2,000,000 (the 0° and 180° meridians). Deciding by the
    // longitude's sign puts the pole itself, at exactly 2,000,000, past the west letter table.
    const west = easting < 2_000_000
    const band = ups.hemisphere === 'N' ? (west ? 'Y' : 'Z') : west ? 'A' : 'B'
    const fe = west ? 800_000 : 2_000_000
    const fn = ups.hemisphere === 'N' ? 1_300_000 : 800_000
    const cols = west ? UPS_COLS_WEST : UPS_COLS_EAST
    const col = cols[Math.floor((easting - fe) / 100_000)] ?? '?'
    const row = UPS_ROWS[Math.floor((northing - fn) / 100_000)] ?? '?'
    return {
      zone: null,
      band,
      square: col + row,
      easting: truncDigits(easting, precision),
      northing: truncDigits(northing, precision),
    }
  }
  const u = toUtm(p)
  const easting = toWholeMetres(u.easting)
  const northing = toWholeMetres(u.northing)
  return {
    zone: u.zone,
    band: u.band,
    square: utmSquareId(u.zone, easting, northing),
    easting: truncDigits(easting, precision),
    northing: truncDigits(northing, precision),
  }
}

export function toMgrs(
  p: LatLon,
  precision: MgrsPrecision = 5,
  spaced = false,
): string {
  const m = toMgrsParts(p, precision)
  const gzd = (m.zone ?? '') + m.band
  const parts = [gzd, m.square, m.easting, m.northing].filter(Boolean)
  return spaced ? parts.join(' ') : parts.join('')
}

const MGRS_RE = /^(\d{1,2})?([A-HJ-NP-Z])([A-HJ-NP-Z]{2})(\d*)$/

export function isMgrs(s: string): boolean {
  const m = MGRS_RE.exec(s.replace(/\s+/g, '').toUpperCase())
  return !!m && m[4]!.length % 2 === 0 && m[4]!.length <= 10
}

export interface MgrsDecoded {
  /** South-west corner of the referenced square. */
  sw: LatLon
  /** Centre of the referenced square. */
  center: LatLon
  /** Square size in metres. */
  size: number
}

/** Decode an MGRS string. */
export function fromMgrs(input: string): MgrsDecoded {
  const s = input.replace(/\s+/g, '').toUpperCase()
  const m = MGRS_RE.exec(s)
  if (!m) throw new Error(`Invalid MGRS "${input}"`)
  // NOTE: the pattern makes the band, square and digit groups required; only the zone is optional.
  const [, zoneStr, band = '', sq = '', digits = ''] = m
  if (digits.length % 2 !== 0 || digits.length > 10)
    throw new Error('MGRS needs an even number of digits (max 10)')
  const precision = digits.length / 2
  const size = Math.pow(10, 5 - precision)
  const e100 = precision ? Number(digits.slice(0, precision)) * size : 0
  const n100 = precision ? Number(digits.slice(precision)) * size : 0

  const at = (de: number, dn: number): LatLon =>
    decodeAt(zoneStr, band, sq, e100 + de, n100 + dn)
  return { sw: at(0, 0), center: at(size / 2, size / 2), size }
}

/**
 * How far outside its latitude band a decoded point may fall. A 100 km square can start about
 * 0.9° beyond the band it is named for, so "31X CV" at 72°N has its corner in band W. The row
 * letters repeat every 2,000 km (about 18°), so this margin cannot pick the wrong cycle.
 */
const BAND_TOLERANCE_DEGREES = 1.5

function decodeAt(
  zoneStr: string | undefined,
  band: string,
  sq: string,
  e100: number,
  n100: number,
): LatLon {
  const col = sq[0]!
  const row = sq[1]!

  if (!zoneStr) {
    if (!'ABYZ'.includes(band))
      throw new Error('A grid zone number is required outside the polar areas')
    const west = band === 'A' || band === 'Y'
    const north = band === 'Y' || band === 'Z'
    const cols = west ? UPS_COLS_WEST : UPS_COLS_EAST
    const ci = cols.indexOf(col)
    const ri = UPS_ROWS.indexOf(row)
    if (ci < 0 || ri < 0) throw new Error(`Invalid UPS 100 km square "${sq}"`)
    const fe = west ? 800_000 : 2_000_000
    const fn = north ? 1_300_000 : 800_000
    return fromUps(
      north ? 'N' : 'S',
      fe + ci * 100_000 + e100,
      fn + ri * 100_000 + n100,
    )
  }

  const zone = Number(zoneStr)
  if (zone < 1 || zone > 60) throw new Error(`Invalid grid zone ${zone}`)
  if (!LAT_BANDS.includes(band))
    throw new Error(`Invalid latitude band "${band}"`)

  const set = COL_SETS[(zone - 1) % 3]!
  const ci = set.indexOf(col)
  if (ci < 0)
    throw new Error(`Column letter "${col}" is not valid in zone ${zone}`)
  const rowOffset = zone % 2 === 0 ? 5 : 0
  const ri = ROW_LETTERS.indexOf(row)
  if (ri < 0) throw new Error(`Invalid row letter "${row}"`)

  const easting = (ci + 1) * 100_000 + e100
  const rowNorthing = ((((ri - rowOffset) % 20) + 20) % 20) * 100_000 + n100

  const hemisphere = band >= 'N' ? 'N' : 'S'
  // Resolve the 2,000 km row cycle from the latitude band.
  const south = bandSouth(band)
  const bandMin = toUtm(
    { lat: south, lon: centralMeridian(zone) },
    zone,
  ).northing
  let northing = rowNorthing
  while (northing < bandMin - 100_000) northing += 2_000_000

  const p = fromUtm(zone, hemisphere, easting, northing)
  if (
    p.lat < south - BAND_TOLERANCE_DEGREES ||
    p.lat > bandNorth(band) + BAND_TOLERANCE_DEGREES
  ) {
    throw new Error(`Square ${sq} does not fall in band ${band}`)
  }
  return p
}
