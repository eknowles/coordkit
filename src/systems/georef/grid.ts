/** GEOREF 15° quadrangles and 1° squares, by zoom level. */
import {
  type Box,
  type GridGeometry,
  type GridLabel,
  type GridPath,
  type Position,
  boxPath,
  densify,
} from '../../geo/geometry'
import { fromGeoref, quadrangleLabel, toGeoref } from './georef'

const QUADRANGLE = 15
const SQUARE_ZOOM = 6
const MAX_LINES = 800
const MAX_LABELS = 500

export function georefGrid(view: Box, zoom: number): GridGeometry {
  const spacing = zoom < SQUARE_ZOOM ? QUADRANGLE : 1
  const paths: GridPath[] = []
  const labels: GridLabel[] = []
  const [w, s, e, n] = view
  const x0 = Math.floor((w + 180) / spacing)
  const x1 = Math.ceil((e + 180) / spacing)
  const y0 = Math.floor((s + 90) / spacing)
  const y1 = Math.ceil((n + 90) / spacing)
  if (x1 - x0 + (y1 - y0) > MAX_LINES) return { paths, labels }

  const widthFor = (degrees: number) =>
    Math.round(degrees) % QUADRANGLE === 0 ? 1.6 : 0.6
  for (let i = x0; i <= x1; i++) {
    const lon = -180 + i * spacing
    paths.push({
      path: densify([lon, s], [lon, n], Math.max(spacing, (n - s) / 32)),
      width: widthFor(lon + 180),
    })
  }
  for (let j = y0; j <= y1; j++) {
    const lat = -90 + j * spacing
    paths.push({
      path: densify([w, lat], [e, lat], Math.max(spacing, (e - w) / 32)),
      width: widthFor(lat + 90),
    })
  }

  if ((x1 - x0) * (y1 - y0) <= MAX_LABELS) {
    for (let i = x0; i < x1; i++) {
      for (let j = y0; j < y1; j++) {
        const west = -180 + i * spacing
        const south = -90 + j * spacing
        if (south < -90 || south >= 90 || west < -180 || west >= 180) continue
        const centre = { lat: south + spacing / 2, lon: west + spacing / 2 }
        labels.push({
          position: [centre.lon, centre.lat],
          text:
            spacing === QUADRANGLE
              ? quadrangleLabel(west, south)
              : toGeoref(centre, false),
          size: 12,
        })
      }
    }
  }
  return { paths, labels }
}

export function georefCellOutline(code: string): Position[] {
  const cell = fromGeoref(code)
  return boxPath([cell.west, cell.south, cell.east, cell.north], 0.01)
}
