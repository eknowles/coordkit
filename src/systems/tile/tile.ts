/**
 * Web map tiles (the XYZ or "slippy map" scheme): Web Mercator split into 2^z × 2^z tiles,
 * x from 180°W and y from the north edge, as OpenStreetMap, MapLibre and most tile servers
 * use. A quadkey (Bing Maps) writes the same tile as one base-4 digit per zoom level.
 */
import type { LatLon } from '../../geo/ellipsoid'

/** Web Mercator stops here, so the tile grid is square. */
export const MAX_TILE_LATITUDE = 85.0511287798066
export const MAX_TILE_ZOOM = 24

export interface Tile {
  z: number
  x: number
  y: number
}

export interface TileCell {
  west: number
  south: number
  east: number
  north: number
}

const tileCount = (z: number) => 2 ** z

export function toTile({ lat, lon }: LatLon, z: number): Tile {
  const count = tileCount(z)
  const clampedLat = Math.max(
    -MAX_TILE_LATITUDE,
    Math.min(MAX_TILE_LATITUDE, lat),
  )
  const latRadians = (clampedLat * Math.PI) / 180
  const wrappedLon = ((((lon + 180) % 360) + 360) % 360) - 180
  const x = Math.floor(((wrappedLon + 180) / 360) * count)
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRadians) + 1 / Math.cos(latRadians)) / Math.PI) /
      2) *
      count,
  )
  return {
    z,
    x: Math.min(count - 1, Math.max(0, x)),
    y: Math.min(count - 1, Math.max(0, y)),
  }
}

/** The latitude of a tile row's north edge. */
export function tileRowLatitude(y: number, z: number): number {
  const n = Math.PI * (1 - (2 * y) / tileCount(z))
  return (Math.atan(Math.sinh(n)) * 180) / Math.PI
}

export function tileColumnLongitude(x: number, z: number): number {
  return (x / tileCount(z)) * 360 - 180
}

export function tileCell({ z, x, y }: Tile): TileCell {
  return {
    west: tileColumnLongitude(x, z),
    east: tileColumnLongitude(x + 1, z),
    north: tileRowLatitude(y, z),
    south: tileRowLatitude(y + 1, z),
  }
}

export const tilePath = ({ z, x, y }: Tile): string => `${z}/${x}/${y}`

export function toQuadkey({ z, x, y }: Tile): string {
  let quadkey = ''
  for (let level = z; level > 0; level--) {
    const mask = 1 << (level - 1)
    quadkey += String((x & mask ? 1 : 0) + (y & mask ? 2 : 0))
  }
  return quadkey
}

export function fromQuadkey(quadkey: string): Tile {
  if (!/^[0-3]{1,24}$/.test(quadkey))
    throw new Error(`Invalid quadkey "${quadkey}"`)
  let x = 0
  let y = 0
  const z = quadkey.length
  for (let index = 0; index < z; index++) {
    const mask = 1 << (z - index - 1)
    const digit = Number(quadkey.charAt(index))
    if (digit & 1) x |= mask
    if (digit & 2) y |= mask
  }
  return { z, x, y }
}

const TILE_PATH_RE = /^(\d{1,2})\/(\d+)\/(\d+)$/

/** Read `z/x/y`; the tile must exist at that zoom. */
export function fromTilePath(text: string): Tile {
  const match = TILE_PATH_RE.exec(text)
  if (!match) throw new Error(`Invalid tile "${text}"`)
  const [z, x, y] = [match[1], match[2], match[3]].map(Number)
  if (
    z === undefined ||
    x === undefined ||
    y === undefined ||
    z > MAX_TILE_ZOOM
  )
    throw new Error(`Invalid tile "${text}"`)
  if (x >= tileCount(z) || y >= tileCount(z))
    throw new Error(`Tile "${text}" is outside zoom ${z}`)
  return { z, x, y }
}
