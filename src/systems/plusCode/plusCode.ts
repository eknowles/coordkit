/**
 * Open Location Code (Plus Codes), Google.
 *
 * Five digit pairs (latitude then longitude) at 20°, 1°, 0.05°, 0.0025° and 0.000125°, written
 * with a "+" after the eighth digit, then optional grid digits that split a cell 4 × 5.
 * Only full codes are read: a short code needs a reference location.
 */
import type { LatLon } from '../../geo/ellipsoid'

const ALPHABET = '23456789CFGHJMPQRVWX'
const BASE = 20
export const PAIR_RESOLUTIONS = [20, 1, 0.05, 0.0025, 0.000125]
const PAIR_LENGTH = 10
const SEPARATOR_POSITION = 8
const GRID_ROWS = 5
const GRID_COLUMNS = 4
const MAX_LATITUDE = 90
const MAX_LONGITUDE = 180

const wrapLon = (lon: number) =>
  ((((lon + MAX_LONGITUDE) % 360) + 360) % 360) - MAX_LONGITUDE

export interface PlusCodeCell {
  west: number
  south: number
  east: number
  north: number
}

/** The height of a code's cell, which is how far latitude 90 moves down so it can be decoded. */
function latitudePrecision(length: number): number {
  if (length <= PAIR_LENGTH) {
    return BASE ** Math.floor(length / -2 + 2)
  }
  return BASE ** -3 / GRID_ROWS ** (length - PAIR_LENGTH)
}

/** Clip the latitude, wrap the longitude, and move the north pole just inside the top cell. */
function normalise({ lat, lon }: LatLon, length: number): LatLon {
  const clippedLat = Math.min(Math.max(lat, -MAX_LATITUDE), MAX_LATITUDE)
  return {
    lat:
      clippedLat === MAX_LATITUDE
        ? clippedLat - latitudePrecision(length)
        : clippedLat,
    lon: wrapLon(lon),
  }
}

function encodePairs({ lat, lon }: LatLon, pairCount: number): string {
  let latValue = lat + MAX_LATITUDE
  let lonValue = lon + MAX_LONGITUDE
  let digits = ''
  for (let pair = 0; pair < pairCount; pair++) {
    const resolution = PAIR_RESOLUTIONS[pair]!
    const latIndex = Math.min(BASE - 1, Math.floor(latValue / resolution))
    const lonIndex = Math.min(BASE - 1, Math.floor(lonValue / resolution))
    digits += ALPHABET.charAt(latIndex) + ALPHABET.charAt(lonIndex)
    latValue -= latIndex * resolution
    lonValue -= lonIndex * resolution
  }
  return digits
}

// NOTE: this follows Google's reference implementation step for step, including taking the
// remainder of the whole coordinate, so the grid digit matches it at cell edges.
function encodeGrid({ lat, lon }: LatLon, gridDigits: number): string {
  let latPlace = PAIR_RESOLUTIONS[PAIR_RESOLUTIONS.length - 1]!
  let lonPlace = latPlace
  let latValue = (lat + MAX_LATITUDE) % latPlace
  let lonValue = (lon + MAX_LONGITUDE) % lonPlace
  let digits = ''
  for (let index = 0; index < gridDigits; index++) {
    const row = Math.floor(latValue / (latPlace / GRID_ROWS))
    const column = Math.floor(lonValue / (lonPlace / GRID_COLUMNS))
    latPlace /= GRID_ROWS
    lonPlace /= GRID_COLUMNS
    latValue -= row * latPlace
    lonValue -= column * lonPlace
    digits += ALPHABET.charAt(row * GRID_COLUMNS + column)
  }
  return digits
}

/** The digit pairs (no separator, no padding) for a point, to `pairCount` pairs. */
export function pairDigits(point: LatLon, pairCount: number): string {
  return encodePairs(normalise(point, pairCount * 2), pairCount)
}

/** A full Plus Code: 10 digits, or more with grid refinement digits. */
export function toPlusCode(point: LatLon, length = PAIR_LENGTH): string {
  const normalised = normalise(point, length)
  const digits =
    encodePairs(normalised, PAIR_LENGTH / 2) +
    encodeGrid(normalised, Math.max(0, length - PAIR_LENGTH))
  return withSeparator(digits)
}

/** Put the "+" after the eighth digit, padding a shorter code with zeros. */
export function withSeparator(digits: string): string {
  if (digits.length >= SEPARATOR_POSITION) {
    return `${digits.slice(0, SEPARATOR_POSITION)}+${digits.slice(SEPARATOR_POSITION)}`
  }
  return `${digits.padEnd(SEPARATOR_POSITION, '0')}+`
}

function fromDigits(digits: string): PlusCodeCell {
  let south = -MAX_LATITUDE
  let west = -MAX_LONGITUDE
  let height = 0
  let width = 0
  const pairs = Math.min(digits.length, PAIR_LENGTH)
  for (let index = 0; index < pairs; index += 2) {
    const resolution = PAIR_RESOLUTIONS[index / 2]!
    south += ALPHABET.indexOf(digits.charAt(index)) * resolution
    west += ALPHABET.indexOf(digits.charAt(index + 1)) * resolution
    height = resolution
    width = resolution
  }
  for (let index = PAIR_LENGTH; index < digits.length; index++) {
    const value = ALPHABET.indexOf(digits.charAt(index))
    height /= GRID_ROWS
    width /= GRID_COLUMNS
    south += Math.floor(value / GRID_COLUMNS) * height
    west += (value % GRID_COLUMNS) * width
  }
  return { west, south, east: west + width, north: south + height }
}

const FULL_CODE_RE =
  /^([2-9C][2-9CFGHJMPQRV])([2-9CFGHJMPQRVWX]{6}|[2-9CFGHJMPQRVWX]{4}00|[2-9CFGHJMPQRVWX]{2}0000|000000)\+([2-9CFGHJMPQRVWX]{2,7})?$/

/** Whether text is a full Plus Code, with or without padding. */
export function isFullPlusCode(text: string): boolean {
  const code = text.toUpperCase()
  const match = FULL_CODE_RE.exec(code)
  if (!match) return false
  const isPadded = code.includes('0')
  if (isPadded && match[3] !== undefined) return false
  const tail = match[3] ?? ''
  return tail.length !== 1
}

/** The cell a full Plus Code names. */
export function fromPlusCode(text: string): PlusCodeCell {
  if (!isFullPlusCode(text)) throw new Error(`Invalid Plus Code "${text}"`)
  const digits = text.toUpperCase().replace('+', '').replace(/0+$/, '')
  return fromDigits(digits)
}
