/**
 * Range rings around the cue: geodesic circles on WGS84 at an even spacing, like radar
 * range rings. 'Auto' picks a 1-2-5 spacing from the zoom, as a radar picks a range scale.
 */
import type { Layer } from '@deck.gl/core'
import { PathLayer } from '@deck.gl/layers'
import { Array, Option } from 'effect'

import type { MapView, RingSpacing, RingUnit } from '../app/domain'
import type { LatLon } from '../geo/ellipsoid'
import { METRES_PER_NAUTICAL_MILE, destination } from '../geo/geodesic'
import type { GridLabel, Position, RGBA } from '../geo/geometry'
import { CUE_COLOR } from './cue'
import { onTop } from './layerDefaults'

export const RING_COUNT = 6

const unitMetres: Record<RingUnit, number> = { NauticalMiles: METRES_PER_NAUTICAL_MILE, Kilometres: 1000 }
const unitSymbol: Record<RingUnit, string> = { NauticalMiles: 'NM', Kilometres: 'km' }

const NICE_STEPS: Array.NonEmptyReadonlyArray<number> = [0.1, 0.25, 0.5, 1, 2, 5, 10, 25, 50, 100, 250, 500]

const METRES_PER_DEGREE_LATITUDE = 111_320
/** The outer ring reaches this share of the distance from the centre to the top of the view. */
const AUTO_FILL = 0.85
const BEARING_STEP_DEGREES = 2

const RING_COLOR: RGBA = [CUE_COLOR[0], CUE_COLOR[1], CUE_COLOR[2], 170]

/** Largest 1-2-5 step that keeps all rings inside the view. */
export const autoStep = (view: MapView, unit: RingUnit): number => {
  const halfHeight = ((view.bounds.north - view.bounds.south) * METRES_PER_DEGREE_LATITUDE) / 2
  const target = (AUTO_FILL * halfHeight) / RING_COUNT / unitMetres[unit]
  return Option.getOrElse(Array.findLast(NICE_STEPS, step => step <= target), () => Array.headNonEmpty(NICE_STEPS))
}

export const ringStep = (spacing: RingSpacing, view: MapView, unit: RingUnit): number =>
  spacing === 'Auto' ? autoStep(view, unit) : Number(spacing)

/** Keep longitudes continuous around the cue so a ring that crosses the antimeridian does not jump. */
const unwrapAround = (centre: number, lon: number): number => {
  const delta = ((((lon - centre) % 360) + 540) % 360) - 180
  return centre + delta
}

export const ringPath = (cue: LatLon, radiusMetres: number): Array<Position> =>
  Array.makeBy(360 / BEARING_STEP_DEGREES + 1, index => {
    const point = destination(cue, index * BEARING_STEP_DEGREES, radiusMetres)
    return [unwrapAround(cue.lon, point.lon), point.lat]
  })

export const ringLabelText = (index: number, step: number, unit: RingUnit): string =>
  `${Number((index * step).toFixed(2))} ${unitSymbol[unit]}`

type Ring = Readonly<{ path: Array<Position>; label: GridLabel }>

export const buildRings = (cue: LatLon, step: number, unit: RingUnit): ReadonlyArray<Ring> =>
  Array.makeBy(RING_COUNT, offset => {
    const index = offset + 1
    const radius = index * step * unitMetres[unit]
    const north = destination(cue, 0, radius)
    return {
      path: ringPath(cue, radius),
      label: { position: [cue.lon, north.lat], text: ringLabelText(index, step, unit), size: 11 },
    }
  })

export const ringLayer = (rings: ReadonlyArray<Ring>): Layer =>
  new PathLayer<Ring>({
    ...onTop,
    id: 'range-rings',
    data: [...rings],
    getPath: ring => ring.path,
    getColor: RING_COLOR,
    getWidth: 1.25,
    widthUnits: 'pixels',
  })
