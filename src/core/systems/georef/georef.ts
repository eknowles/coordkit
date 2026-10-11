/**
 * World Geographic Reference System (GEOREF), the aviation grid.
 *
 * 15° quadrangle: longitude letter (A-Z without I and O, from 180°W) then latitude letter
 *                 (A-M without I, from 90°S)
 * 1° square:      longitude letter then latitude letter (A-Q without I and O)
 * minutes:        two longitude digits then two latitude digits (00-59)
 */
import type { LatLon } from '../../geo/ellipsoid'

const QUADRANGLE_LON = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
const QUADRANGLE_LAT = 'ABCDEFGHJKLM'
const DEGREE_LETTERS = 'ABCDEFGHJKLMNPQ'
const QUADRANGLE_DEGREES = 15
const MINUTES_PER_DEGREE = 60

export interface GeorefCell {
  west: number
  south: number
  east: number
  north: number
}

/** The GEOREF for a point, to whole degrees (4 letters) or to whole minutes (8 characters). */
export function toGeoref({ lat, lon }: LatLon, withMinutes = true): string {
  // Work in whole minutes so cell edges do not drift.
  const lonMinutes = Math.min(
    360 * MINUTES_PER_DEGREE - 1,
    Math.max(0, Math.floor((lon + 180) * MINUTES_PER_DEGREE + 1e-9)),
  )
  const latMinutes = Math.min(
    180 * MINUTES_PER_DEGREE - 1,
    Math.max(0, Math.floor((lat + 90) * MINUTES_PER_DEGREE + 1e-9)),
  )
  const lonDegrees = Math.floor(lonMinutes / MINUTES_PER_DEGREE)
  const latDegrees = Math.floor(latMinutes / MINUTES_PER_DEGREE)
  const letters =
    QUADRANGLE_LON.charAt(Math.floor(lonDegrees / QUADRANGLE_DEGREES)) +
    QUADRANGLE_LAT.charAt(Math.floor(latDegrees / QUADRANGLE_DEGREES)) +
    DEGREE_LETTERS.charAt(lonDegrees % QUADRANGLE_DEGREES) +
    DEGREE_LETTERS.charAt(latDegrees % QUADRANGLE_DEGREES)
  if (!withMinutes) return letters
  const pad = (minutes: number) =>
    String(minutes % MINUTES_PER_DEGREE).padStart(2, '0')
  return letters + pad(lonMinutes) + pad(latMinutes)
}

/** The 15° quadrangle letters for the quadrangle whose south-west corner is given. */
export function quadrangleLabel(west: number, south: number): string {
  return (
    QUADRANGLE_LON.charAt(Math.floor((west + 180) / QUADRANGLE_DEGREES)) +
    QUADRANGLE_LAT.charAt(Math.floor((south + 90) / QUADRANGLE_DEGREES))
  )
}

const GEOREF_RE =
  /^([A-HJ-NP-Z])([A-HJ-M])([A-HJ-NP-Q])([A-HJ-NP-Q])(?:(\d{2})(\d{2})|(\d{3})(\d{3}))?$/

export function isGeoref(text: string): boolean {
  return GEOREF_RE.test(text.replace(/\s+/g, '').toUpperCase())
}

/** The cell a GEOREF names: 1° for letters only, 1′ or 0.1′ with digits. */
export function fromGeoref(input: string): GeorefCell {
  const code = input.replace(/\s+/g, '').toUpperCase()
  const m = GEOREF_RE.exec(code)
  if (!m) throw new Error(`Invalid GEOREF "${input}"`)
  const [, lonQuad = '', latQuad = '', lonDeg = '', latDeg = ''] = m
  let west =
    -180 +
    QUADRANGLE_LON.indexOf(lonQuad) * QUADRANGLE_DEGREES +
    DEGREE_LETTERS.indexOf(lonDeg)
  let south =
    -90 +
    QUADRANGLE_LAT.indexOf(latQuad) * QUADRANGLE_DEGREES +
    DEGREE_LETTERS.indexOf(latDeg)
  let size = 1
  const lonDigits = m[5] ?? m[7]
  const latDigits = m[6] ?? m[8]
  if (lonDigits !== undefined && latDigits !== undefined) {
    const divisor = lonDigits.length === 2 ? 1 : 10
    const lonMinutes = Number(lonDigits) / divisor
    const latMinutes = Number(latDigits) / divisor
    if (lonMinutes >= MINUTES_PER_DEGREE || latMinutes >= MINUTES_PER_DEGREE)
      throw new Error('GEOREF minutes must be under 60')
    west += lonMinutes / MINUTES_PER_DEGREE
    south += latMinutes / MINUTES_PER_DEGREE
    size = 1 / MINUTES_PER_DEGREE / divisor
  }
  if (south >= 90) throw new Error('GEOREF latitude is past the pole')
  return { west, south, east: west + size, north: south + size }
}
