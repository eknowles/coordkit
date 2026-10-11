/**
 * Degrees and decimal minutes grid, as on a nautical chart: lines at whole degrees and minutes,
 * chart-style labels, and minute ticks along the edges of the view. One minute of latitude is
 * one nautical mile.
 */
import type { LatLon } from '../../geo/ellipsoid'
import {
  type Box,
  type GridGeometry,
  type GridLabel,
  type GridPath,
  type Position,
  boxPath,
  densify,
} from '../../geo/geometry'
import { hemi } from './angles'

/** Grid steps in hundredths of a minute, so lines fall on exact minute values. */
const UNITS_PER_MINUTE = 100
const UNITS_PER_DEGREE = 60 * UNITS_PER_MINUTE

/** Line and tick steps, largest first: 10°, 5°, 2°, 1°, 30′, 20′, 10′, 5′, 2′, 1′, then tenths and hundredths. */
const STEPS = [
  60000, 30000, 12000, 6000, 3000, 2000, 1000, 500, 200, 100, 50, 20, 10, 5, 2,
  1,
]

/** About two dozen lines across the view, the same density as the decimal graticule. */
const MAX_LINES = 24

/** At least this many ticks between two grid lines; fewer ticks are not drawn. */
const MIN_TICKS_PER_STEP = 4

/** Tick length as a fraction of the view height. */
const TICK_FRACTION = 0.012

const LABEL_INSET = 0.03

/** The smallest step that keeps no more than MAX_LINES lines across the larger span. */
export function ddmStep(view: Box): number {
  const span = Math.max(view[2] - view[0], view[3] - view[1]) * UNITS_PER_DEGREE
  return STEPS.findLast(step => span / step <= MAX_LINES) ?? STEPS[0]!
}

/** The largest step that divides a line step into at least MIN_TICKS_PER_STEP parts, or 0 for no ticks. */
export function ddmTickStep(lineStep: number): number {
  return (
    STEPS.find(
      step => lineStep % step === 0 && lineStep / step >= MIN_TICKS_PER_STEP,
    ) ?? 0
  )
}

const wrapLon = (lon: number): number =>
  ((((lon + 180) % 360) + 360) % 360) - 180

/** A grid value as a chart label: `50° N` at whole-degree steps, else `50° 30′ N` or `001° 15.5′ W`; the antimeridian is `180°`. */
export function formatDdmLabel(
  units: number,
  axis: 'lat' | 'lon',
  step: number,
): string {
  const abs = Math.abs(units)
  const degrees = Math.floor(abs / UNITS_PER_DEGREE)
  const minuteUnits = abs - degrees * UNITS_PER_DEGREE
  // NOTE: the antimeridian is neither east nor west, so charts write it as plain 180°.
  const hemisphere =
    axis === 'lon' && abs === 180 * UNITS_PER_DEGREE
      ? ''
      : ` ${hemi(units, axis, units === 0)}`
  const paddedDegrees = String(degrees).padStart(axis === 'lat' ? 2 : 3, '0')
  if (step % UNITS_PER_DEGREE === 0) {
    return `${paddedDegrees}°${hemisphere}`
  }
  const decimals =
    step % UNITS_PER_MINUTE === 0
      ? 0
      : step % (UNITS_PER_MINUTE / 10) === 0
        ? 1
        : 2
  const minutes = (minuteUnits / UNITS_PER_MINUTE)
    .toFixed(decimals)
    .padStart(decimals === 0 ? 2 : decimals + 3, '0')
  return `${paddedDegrees}° ${minutes}′${hemisphere}`
}

/** Grid values in [low, high], as whole multiples of step. */
function valuesIn(low: number, high: number, step: number): number[] {
  const values: number[] = []
  const first = Math.ceil((low * UNITS_PER_DEGREE) / step)
  const last = Math.floor((high * UNITS_PER_DEGREE) / step)
  for (let i = first; i <= last; i++) values.push(i * step)
  return values
}

export function buildDdmGrid(view: Box): GridGeometry {
  const [w, s, e, n] = view
  const south = Math.max(s, -90)
  const north = Math.min(n, 90)
  const step = ddmStep(view)
  const paths: GridPath[] = []
  const labels: GridLabel[] = []
  const widthFor = (units: number) => (units % UNITS_PER_DEGREE === 0 ? 1.6 : 1)

  for (const units of valuesIn(w, e, step)) {
    const lon = units / UNITS_PER_DEGREE
    paths.push({
      path: densify([lon, south], [lon, north], (north - south) / 32),
      width: widthFor(units),
    })
    labels.push({
      position: [lon, south + (north - south) * LABEL_INSET],
      text: formatDdmLabel(
        Math.round(wrapLon(lon) * UNITS_PER_DEGREE),
        'lon',
        step,
      ),
      size: 10,
    })
  }
  for (const units of valuesIn(south, north, step)) {
    const lat = units / UNITS_PER_DEGREE
    paths.push({
      path: densify([w, lat], [e, lat], (e - w) / 32),
      width: widthFor(units),
    })
    labels.push({
      position: [w + (e - w) * LABEL_INSET, lat],
      text: formatDdmLabel(units, 'lat', step),
      size: 10,
    })
  }

  paths.push(...edgeTicks([w, south, e, north], step))
  return { paths, labels }
}

/**
 * Minute ticks along the four edges of the view, like the latitude and longitude scales on a
 * chart border. A tick across a parallel is as long on the ground as a tick across a meridian.
 */
function edgeTicks(view: Box, lineStep: number): GridPath[] {
  const tickStep = ddmTickStep(lineStep)
  if (!tickStep) return []
  const [w, s, e, n] = view
  const latLength = (n - s) * TICK_FRACTION
  const midLat = (((s + n) / 2) * Math.PI) / 180
  const lonLength = latLength / Math.max(Math.cos(midLat), 0.01)
  const tick = (from: Position, to: Position): GridPath => ({
    path: [from, to],
    width: 1,
  })
  const ticks: GridPath[] = []
  for (const units of valuesIn(w, e, tickStep)) {
    if (units % lineStep === 0) continue
    const lon = units / UNITS_PER_DEGREE
    ticks.push(tick([lon, s], [lon, s + latLength]))
    ticks.push(tick([lon, n], [lon, n - latLength]))
  }
  for (const units of valuesIn(s, n, tickStep)) {
    if (units % lineStep === 0) continue
    const lat = units / UNITS_PER_DEGREE
    ticks.push(tick([w, lat], [w + lonLength, lat]))
    ticks.push(tick([e, lat], [e - lonLength, lat]))
  }
  return ticks
}

/** The one-minute cell (one nautical mile north to south) that contains a point. */
export function ddmCellOutline(point: LatLon): Position[] {
  const minute = 1 / 60
  const south = Math.min(Math.floor(point.lat * 60) / 60, 90 - minute)
  const west = Math.min(Math.floor(point.lon * 60) / 60, 180 - minute)
  return boxPath([west, south, west + minute, south + minute], minute)
}
