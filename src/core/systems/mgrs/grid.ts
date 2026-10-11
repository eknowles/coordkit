/** MGRS grid lines and 100 km square labels, clipped to each grid zone. */
import type { LatLon } from '../../geo/ellipsoid'
import {
  type Box,
  type GridGeometry,
  type GridLabel,
  type GridPath,
  type Position,
  boxPath,
  inBox,
  intersectBoxes,
} from '../../geo/geometry'
import { GZD_CELLS, cellBox } from '../utm/gzd'
import { type Hemisphere, fromUtm, toUtm } from '../utm/utm'
import { fromMgrs, utmSquareId } from './mgrs'

/** MGRS grid spacing in metres for a zoom level, or 0 for none. */
export function mgrsSpacing(zoom: number): number {
  if (zoom < 5) return 0
  if (zoom < 8.5) return 100_000
  if (zoom < 11.5) return 10_000
  if (zoom < 14.5) return 1_000
  return 100
}

/**
 * Trace a straight grid line in UTM space and clip it to `clip` in geographic space.
 * Boundary crossings are found by bisection so lines end on the zone edge.
 */
function traceClipped(
  zone: number,
  hemi: Hemisphere,
  at: (t: number) => [number, number],
  steps: number,
  clip: Box,
): Position[][] {
  const runs: Position[][] = []
  const geo = (t: number) => {
    const [e, n] = at(t)
    return fromUtm(zone, hemi, e, n)
  }
  const edge = (tIn: number, tOut: number): LatLon => {
    for (let i = 0; i < 30; i++) {
      const mid = (tIn + tOut) / 2
      if (inBox(geo(mid), clip)) tIn = mid
      else tOut = mid
    }
    return geo(tIn)
  }
  let run: Position[] | null = null
  let prevT = 0
  let prevIn = false
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const p = geo(t)
    const inside = inBox(p, clip)
    if (inside && !prevIn) {
      run = []
      if (i > 0) {
        const q = edge(t, prevT)
        run.push([q.lon, q.lat])
      }
    }
    if (!inside && prevIn && run) {
      const q = edge(prevT, t)
      run.push([q.lon, q.lat])
      runs.push(run)
      run = null
    }
    if (inside) run!.push([p.lon, p.lat])
    prevIn = inside
    prevT = t
  }
  if (run && run.length > 1) runs.push(run)
  return runs
}

/** Full grid lines, or only ticks at the edges of the view and crosses at the intersections. */
export type MgrsGridStyle = 'Lines' | 'Ticks'

/** Tick length as a fraction of the view height. */
const TICK_FRACTION = 0.02

/** Cross arm length as a fraction of the grid spacing. */
const CROSS_FRACTION = 0.06

/** The first `length` of a path from its start, measured in degrees of latitude on the ground. */
function headOf(path: ReadonlyArray<Position>, length: number): Position[] {
  const head: Position[] = [path[0]!]
  let remaining = length
  for (let i = 1; i < path.length; i++) {
    const [lonA, latA] = path[i - 1]!
    const [lonB, latB] = path[i]!
    const cosLat = Math.cos((((latA + latB) / 2) * Math.PI) / 180)
    const step = Math.hypot((lonB - lonA) * cosLat, latB - latA)
    if (step >= remaining) {
      const k = step === 0 ? 0 : remaining / step
      head.push([lonA + (lonB - lonA) * k, latA + (latB - latA) * k])
      return head
    }
    head.push([lonB, latB])
    remaining -= step
  }
  return head
}

/** The digits a grid value shows at the given spacing, as in a square label: 620000 at 1 km is "20". */
function gridDigits(value: number, spacing: number): string {
  const digits = Math.round(Math.log10(100_000 / spacing))
  return String(Math.floor((value % 100_000) / spacing)).padStart(digits, '0')
}

export function mgrsGrid(
  view: Box,
  zoom: number,
  maxLines = 600,
  style: MgrsGridStyle = 'Lines',
): GridGeometry {
  const spacing = mgrsSpacing(zoom)
  const paths: GridPath[] = []
  const labels: GridLabel[] = []
  if (!spacing) return { paths, labels }

  const [viewW, viewS, viewE, viewN] = view
  const tickLength = (viewN - viewS) * TICK_FRACTION
  const edgeTolerance = Math.max(viewE - viewW, viewN - viewS) * 1e-6
  const isOnEdge = ([lon, lat]: Position): boolean =>
    Math.abs(lon - viewW) < edgeTolerance ||
    Math.abs(lon - viewE) < edgeTolerance ||
    Math.abs(lat - viewS) < edgeTolerance ||
    Math.abs(lat - viewN) < edgeTolerance

  /**
   * Add one traced grid line. In tick style only its ends on the view edge remain, and the
   * south and west ends carry the line's digits, like the margin of a chart.
   */
  const emit = (
    path: Position[],
    width: number,
    axis: 'easting' | 'northing',
    value: number,
  ) => {
    if (style === 'Lines') {
      paths.push({ path, width })
      return
    }
    const ends = [path, [...path].reverse()]
    for (const end of ends) {
      const start = end[0]!
      if (!isOnEdge(start)) continue
      const tick = headOf(end, tickLength)
      paths.push({ path: tick, width })
      const isLabelledEdge =
        axis === 'easting'
          ? Math.abs(start[1] - viewS) < edgeTolerance
          : Math.abs(start[0] - viewW) < edgeTolerance
      if (isLabelledEdge && spacing < 100_000) {
        labels.push({
          position: tick[tick.length - 1]!,
          text: gridDigits(value, spacing),
          size: 11,
        })
      }
    }
  }

  let lineCount = 0
  for (const c of GZD_CELLS) {
    if (c.zone === null) continue
    const clip = intersectBoxes(view, cellBox(c))
    if (!clip) continue
    const zone = c.zone
    const hemi: Hemisphere = c.band >= 'N' ? 'N' : 'S'

    // UTM extent of the clipped area, from its densified outline.
    let minE = Infinity
    let maxE = -Infinity
    let minN = Infinity
    let maxN = -Infinity
    for (const [lon, lat] of boxPath(clip, (clip[2] - clip[0]) / 8)) {
      // Keep samples on the cell's side of the equator so northings share one false origin.
      const cellLat =
        hemi === 'S' ? Math.min(lat, -1e-9) : Math.min(lat, 83.9999999)
      const u = toUtm({ lat: cellLat, lon: Math.min(lon, 179.9999999) }, zone)
      minE = Math.min(minE, u.easting)
      maxE = Math.max(maxE, u.easting)
      minN = Math.min(minN, u.northing)
      maxN = Math.max(maxN, u.northing)
    }
    const pad = spacing
    const e0 = Math.floor((minE - pad) / spacing) * spacing
    const n0 = Math.floor((minN - pad) / spacing) * spacing
    const e1 = Math.ceil((maxE + pad) / spacing) * spacing
    const n1 = Math.ceil((maxN + pad) / spacing) * spacing
    const ne = (e1 - e0) / spacing
    const nn = (n1 - n0) / spacing
    if (lineCount + ne + nn > maxLines) continue
    lineCount += ne + nn

    const steps = (count: number) => Math.min(64, Math.max(8, count * 2))
    for (let e = e0; e <= e1; e += spacing) {
      const major = e % 100_000 === 0
      for (const path of traceClipped(
        zone,
        hemi,
        t => [e, n0 + (n1 - n0) * t],
        steps(nn),
        clip,
      )) {
        emit(path, major ? 1.5 : 0.75, 'easting', e)
      }
    }
    for (let n = n0; n <= n1; n += spacing) {
      const major = n % 100_000 === 0
      for (const path of traceClipped(
        zone,
        hemi,
        t => [e0 + (e1 - e0) * t, n],
        steps(ne),
        clip,
      )) {
        emit(path, major ? 1.5 : 0.75, 'northing', n)
      }
    }

    // Tick style marks each grid intersection in view with a small cross.
    if (style === 'Ticks' && ne * nn < 1000) {
      const arm = spacing * CROSS_FRACTION
      for (let e = e0; e <= e1; e += spacing) {
        for (let n = n0; n <= n1; n += spacing) {
          if (!inBox(fromUtm(zone, hemi, e, n), clip)) continue
          for (const [[ea, na], [eb, nb]] of [
            [
              [e - arm, n],
              [e + arm, n],
            ],
            [
              [e, n - arm],
              [e, n + arm],
            ],
          ] as const) {
            const a = fromUtm(zone, hemi, ea, na)
            const b = fromUtm(zone, hemi, eb, nb)
            paths.push({
              path: [
                [a.lon, a.lat],
                [b.lon, b.lat],
              ],
              width: 1,
            })
          }
        }
      }
    }

    // Label 100 km squares at their centres, and finer squares with their digits. Tick style
    // labels finer squares on the edges instead.
    const isSquareLabelled =
      spacing === 100_000 || (style === 'Lines' && ne * nn < 1000)
    if (isSquareLabelled) {
      const size = spacing
      for (let e = e0; e < e1; e += size) {
        for (let n = n0; n < n1; n += size) {
          const p = fromUtm(zone, hemi, e + size / 2, n + size / 2)
          if (!inBox(p, clip)) continue
          const sq = utmSquareId(zone, e, n)
          let text = sq
          if (size < 100_000) {
            const digits = Math.round(Math.log10(100_000 / size))
            const de = String(Math.floor((e % 100_000) / size)).padStart(
              digits,
              '0',
            )
            const dn = String(Math.floor((n % 100_000) / size)).padStart(
              digits,
              '0',
            )
            text = `${sq} ${de} ${dn}`
          }
          labels.push({ position: [p.lon, p.lat], text, size: 12 })
        }
      }
    }
  }
  return { paths, labels }
}

/** Outline of the MGRS square that contains `mgrs` (any precision). */
export function mgrsSquareOutline(mgrs: string): Position[] | null {
  try {
    const compact = mgrs.replace(/\s+/g, '').toUpperCase()
    if (/^[ABYZ]/.test(compact)) return null
    const { sw, size } = fromMgrs(compact)
    const zone = parseInt(compact, 10)
    const u = toUtm(sw, zone)
    const hemi = u.hemisphere
    // Snap the south-west corner to the square grid, then walk the edges in UTM space.
    const e0 = Math.round(u.easting / size) * size
    const n0 = Math.round(u.northing / size) * size
    const corners: [number, number][] = [
      [e0, n0],
      [e0 + size, n0],
      [e0 + size, n0 + size],
      [e0, n0 + size],
      [e0, n0],
    ]
    const out: Position[] = []
    for (let i = 0; i < 4; i++) {
      const [ea, na] = corners[i]!
      const [eb, nb] = corners[i + 1]!
      for (let k = 0; k < 8; k++) {
        const p = fromUtm(
          zone,
          hemi,
          ea + ((eb - ea) * k) / 8,
          na + ((nb - na) * k) / 8,
        )
        out.push([p.lon, p.lat])
      }
    }
    out.push(out[0]!)
    return out
  } catch {
    return null
  }
}
