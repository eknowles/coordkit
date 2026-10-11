/**
 * Global Area Reference System (GARS), NGA.
 *
 * 30' cells:   3-digit longitude band (001-720 from 180°W) + 2-letter latitude band (AA-QZ from 90°S)
 * 15' quadrant: 1 2 / 3 4  (1 = NW)
 * 5' keypad:    1 2 3 / 4 5 6 / 7 8 9  (1 = NW)
 */
import type { LatLon } from '../../geo/ellipsoid'
import type { GarsPrecision } from './precision'

const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ' // no I, O

export interface GarsCell {
  code: string
  west: number
  south: number
  east: number
  north: number
}

export function toGars(
  { lat, lon }: LatLon,
  precision: GarsPrecision = 5,
): string {
  // Work in whole 5-minute steps to avoid floating-point drift at cell edges.
  const lon5 = Math.min(
    4319,
    Math.max(0, Math.floor(((lon + 180) * 60) / 5 + 1e-9)),
  )
  const lat5 = Math.min(
    2159,
    Math.max(0, Math.floor(((lat + 90) * 60) / 5 + 1e-9)),
  )

  const lonBand = Math.floor(lon5 / 6) + 1
  const latIdx = Math.floor(lat5 / 6)
  let code =
    String(lonBand).padStart(3, '0') +
    LETTERS[Math.floor(latIdx / 24)] +
    LETTERS[latIdx % 24]
  if (precision === 30) return code

  const cx = lon5 % 6
  const cy = lat5 % 6
  const quadrant = (cy >= 3 ? 1 : 3) + (cx >= 3 ? 1 : 0)
  code += quadrant
  if (precision === 15) return code

  const keypad = (2 - (cy % 3)) * 3 + (cx % 3) + 1
  return code + keypad
}

const GARS_RE = /^(\d{3})([A-HJ-NP-Q][A-HJ-NP-Z])([1-4])?([1-9])?$/

export function isGars(s: string): boolean {
  return GARS_RE.test(s.replace(/\s+/g, '').toUpperCase())
}

export function fromGars(input: string): GarsCell {
  const code = input.replace(/\s+/g, '').toUpperCase()
  const m = GARS_RE.exec(code)
  if (!m) throw new Error(`Invalid GARS "${input}"`)
  const lonBand = Number(m[1])
  if (lonBand < 1 || lonBand > 720)
    throw new Error('GARS longitude band must be 001-720')
  const latIdx = LETTERS.indexOf(m[2]![0]!) * 24 + LETTERS.indexOf(m[2]![1]!)
  if (latIdx > 359) throw new Error('GARS latitude band must be AA-QZ')

  let west = -180 + (lonBand - 1) * 0.5
  let south = -90 + latIdx * 0.5
  let size = 0.5
  if (m[3]) {
    const q = Number(m[3])
    size = 0.25
    if (q === 2 || q === 4) west += size
    if (q === 1 || q === 2) south += size
  }
  if (m[4]) {
    if (!m[3]) throw new Error('GARS keypad needs a quadrant')
    const k = Number(m[4]) - 1
    size = 5 / 60
    west += (k % 3) * size
    south += (2 - Math.floor(k / 3)) * size
  }
  return { code, west, south, east: west + size, north: south + size }
}
