/** Plus Code cells: 20°, 1°, 0.05°, 0.0025° or 0.000125°, by zoom level. */
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
  PAIR_RESOLUTIONS,
  fromPlusCode,
  pairDigits,
  withSeparator,
} from './plusCode'

/** The zoom each finer level starts at, so a cell is at least about 90 pixels wide. */
const PAIR_ZOOMS = [0, 6, 11, 15, 19]
const MAX_LINES = 800
const MAX_LABELS = 500
const FULL_CODE_PAIRS = 4

/** How many digit pairs the cells at a zoom level have. */
export function plusCodePairs(zoom: number): number {
  return PAIR_ZOOMS.filter(minimum => zoom >= minimum).length
}

const labelFor = (point: { lat: number; lon: number }, pairs: number) => {
  const digits = pairDigits(point, pairs)
  return pairs >= FULL_CODE_PAIRS ? withSeparator(digits) : digits
}

export function plusCodeGrid(view: Box, zoom: number): GridGeometry {
  const pairs = plusCodePairs(zoom)
  const spacing = PAIR_RESOLUTIONS[pairs - 1]!
  const paths: GridPath[] = []
  const labels: GridLabel[] = []
  const [w, s, e, n] = view
  const x0 = Math.floor((w + 180) / spacing)
  const x1 = Math.ceil((e + 180) / spacing)
  const y0 = Math.floor((s + 90) / spacing)
  const y1 = Math.ceil((n + 90) / spacing)
  if (x1 - x0 + (y1 - y0) > MAX_LINES) return { paths, labels }

  for (let i = x0; i <= x1; i++) {
    const lon = -180 + i * spacing
    paths.push({
      path: densify([lon, s], [lon, n], Math.max(spacing, (n - s) / 32)),
      width: 1,
    })
  }
  for (let j = y0; j <= y1; j++) {
    const lat = -90 + j * spacing
    paths.push({
      path: densify([w, lat], [e, lat], Math.max(spacing, (e - w) / 32)),
      width: 1,
    })
  }

  if ((x1 - x0) * (y1 - y0) <= MAX_LABELS) {
    for (let i = x0; i < x1; i++) {
      for (let j = y0; j < y1; j++) {
        const lon = -180 + (i + 0.5) * spacing
        const lat = -90 + (j + 0.5) * spacing
        if (lat < -90 || lat > 90 || lon < -180 || lon > 180) continue
        labels.push({
          position: [lon, lat],
          text: labelFor({ lat, lon }, pairs),
          size: 12,
        })
      }
    }
  }
  return { paths, labels }
}

export function plusCodeCellOutline(code: string): Position[] {
  const cell = fromPlusCode(code)
  return boxPath([cell.west, cell.south, cell.east, cell.north], 0.0001)
}
