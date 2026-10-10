/** MGRS grid zone designations (UTM zones by latitude band) as a map grid. */
import {
  type Box,
  type GridGeometry,
  type GridLabel,
  type GridPath,
  boxPath,
  intersectBoxes,
} from '../../geo/geometry'
import { LAT_BANDS } from './utm'

export interface Cell {
  zone: number | null
  band: string
  west: number
  south: number
  east: number
  north: number
}

/** Every MGRS grid zone designation cell, with the Norway/Svalbard exceptions and UPS caps. */
export const GZD_CELLS: Cell[] = (() => {
  const cells: Cell[] = []
  for (let b = 0; b < 20; b++) {
    const band = LAT_BANDS[b]!
    const south = -80 + b * 8
    const north = band === 'X' ? 84 : south + 8
    for (let zone = 1; zone <= 60; zone++) {
      let west = -180 + (zone - 1) * 6
      let east = west + 6
      if (band === 'V' && zone === 31) east = 3
      if (band === 'V' && zone === 32) west = 3
      if (band === 'X') {
        if (zone === 32 || zone === 34 || zone === 36) continue
        if (zone === 31) east = 9
        if (zone === 33) [west, east] = [9, 21]
        if (zone === 35) [west, east] = [21, 33]
        if (zone === 37) [west, east] = [33, 42]
      }
      cells.push({ zone, band, west, south, east, north })
    }
  }
  cells.push({
    zone: null,
    band: 'A',
    west: -180,
    south: -90,
    east: 0,
    north: -80,
  })
  cells.push({
    zone: null,
    band: 'B',
    west: 0,
    south: -90,
    east: 180,
    north: -80,
  })
  cells.push({
    zone: null,
    band: 'Y',
    west: -180,
    south: 84,
    east: 0,
    north: 90,
  })
  cells.push({
    zone: null,
    band: 'Z',
    west: 0,
    south: 84,
    east: 180,
    north: 90,
  })
  return cells
})()

export const cellBox = (c: Cell): Box => [c.west, c.south, c.east, c.north]

export function gzdGrid(view: Box, zoom: number): GridGeometry {
  const paths: GridPath[] = []
  const labels: GridLabel[] = []
  for (const c of GZD_CELLS) {
    if (!intersectBoxes(view, cellBox(c))) continue
    paths.push({
      path: boxPath([c.west, c.south, c.east, c.north]),
      width: 1.5,
    })
    if (zoom >= 2.5) {
      labels.push({
        position: [(c.west + c.east) / 2, (c.south + c.north) / 2],
        text: `${c.zone ?? ''}${c.band}`,
        size: zoom < 4 ? 11 : 14,
      })
    }
  }
  return { paths, labels }
}
