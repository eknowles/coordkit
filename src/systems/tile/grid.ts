/** Web map tile boundaries at about one tile per 256 to 512 screen pixels. */
import {
  type Box,
  type GridGeometry,
  type GridLabel,
  type GridPath,
  type Position,
  boxPath,
  densify,
} from '../../geo/geometry'
import {
  MAX_TILE_LATITUDE,
  MAX_TILE_ZOOM,
  type Tile,
  tileCell,
  tileColumnLongitude,
  tilePath,
  tileRowLatitude,
  toTile,
} from './tile'

const MAX_LINES = 400
const MAX_LABELS = 300

/**
 * MapLibre draws a 512-pixel world at zoom 0, so 256-pixel tiles one level deeper than the
 * map zoom are drawn between 256 and 512 pixels wide.
 */
export function gridTileZoom(zoom: number): number {
  return Math.min(MAX_TILE_ZOOM, Math.max(0, Math.floor(zoom) + 1))
}

export function tileGrid(view: Box, zoom: number): GridGeometry {
  const z = gridTileZoom(zoom)
  const paths: GridPath[] = []
  const labels: GridLabel[] = []
  const [w, s, e, n] = view
  const south = Math.max(s, -MAX_TILE_LATITUDE)
  const north = Math.min(n, MAX_TILE_LATITUDE)
  if (south >= north) return { paths, labels }

  const northWest = toTile({ lat: north, lon: w }, z)
  const southEast = toTile({ lat: south, lon: Math.min(e, 179.999999) }, z)
  const columns = southEast.x - northWest.x + 1
  const rows = southEast.y - northWest.y + 1
  if (columns + rows > MAX_LINES) return { paths, labels }

  for (let x = northWest.x; x <= southEast.x + 1; x++) {
    const lon = tileColumnLongitude(x, z)
    paths.push({
      path: densify(
        [lon, south],
        [lon, north],
        Math.max(0.01, (north - south) / 32),
      ),
      width: 1,
    })
  }
  for (let y = northWest.y; y <= southEast.y + 1; y++) {
    const lat = tileRowLatitude(y, z)
    if (lat < south || lat > north) continue
    paths.push({
      path: densify([w, lat], [e, lat], Math.max(0.01, (e - w) / 32)),
      width: 1,
    })
  }

  if (columns * rows <= MAX_LABELS) {
    for (let x = northWest.x; x <= southEast.x; x++) {
      for (let y = northWest.y; y <= southEast.y; y++) {
        const tile: Tile = { z, x, y }
        const cell = tileCell(tile)
        labels.push({
          position: [
            (cell.west + cell.east) / 2,
            (cell.south + cell.north) / 2,
          ],
          text: tilePath(tile),
          size: 11,
        })
      }
    }
  }
  return { paths, labels }
}

export function tileOutline(tile: Tile): Position[] {
  const cell = tileCell(tile)
  return boxPath([cell.west, cell.south, cell.east, cell.north], 0.01)
}
