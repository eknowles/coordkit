/** GARS cell lines and labels at 30, 15 or 5 minutes, by zoom level. */
import {
  type Box,
  type GridGeometry,
  type GridLabel,
  type GridPath,
  type Position,
  boxPath,
  densify,
} from '../../geo/geometry'
import { fromGars, toGars } from './gars'

/** GARS spacing in degrees for a zoom level, or 0 for none. */
export function garsSpacing(zoom: number): number {
  if (zoom < 4) return 0
  if (zoom < 7) return 0.5
  if (zoom < 9) return 0.25
  return 5 / 60
}

export function garsGrid(view: Box, zoom: number): GridGeometry {
  const spacing = garsSpacing(zoom)
  const paths: GridPath[] = []
  const labels: GridLabel[] = []
  if (!spacing) return { paths, labels }

  const [w, s, e, n] = view
  const x0 = Math.floor((w + 180) / spacing)
  const x1 = Math.ceil((e + 180) / spacing)
  const y0 = Math.floor((s + 90) / spacing)
  const y1 = Math.ceil((n + 90) / spacing)
  if (x1 - x0 + (y1 - y0) > 800) return { paths, labels }

  const widthFor = (deg: number) => {
    const minutes = Math.round(deg * 60)
    if (minutes % 30 === 0) return 1.6
    if (minutes % 15 === 0) return 1
    return 0.5
  }
  const step = Math.max(spacing, (n - s) / 32)
  for (let i = x0; i <= x1; i++) {
    const lon = -180 + i * spacing
    paths.push({
      path: densify([lon, s], [lon, n], step),
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

  const precision = spacing === 0.5 ? 30 : spacing === 0.25 ? 15 : 5
  if ((x1 - x0) * (y1 - y0) <= 500) {
    for (let i = x0; i < x1; i++) {
      for (let j = y0; j < y1; j++) {
        const lon = -180 + (i + 0.5) * spacing
        const lat = -90 + (j + 0.5) * spacing
        if (lat < -90 || lat > 90 || lon < -180 || lon > 180) continue
        labels.push({
          position: [lon, lat],
          text: toGars({ lat, lon }, precision),
          size: 12,
        })
      }
    }
  }
  return { paths, labels }
}

export function garsCellOutline(code: string): Position[] {
  const c = fromGars(code)
  return boxPath([c.west, c.south, c.east, c.north], 0.05)
}
