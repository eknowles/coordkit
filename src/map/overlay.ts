import { Array, Option } from 'effect'

import type { GridToggles, MapStyle, RangeRings } from '../core/domain'
import type { LatLon } from '../core/geo/ellipsoid'
import type { Box, GridGeometry } from '../core/geo/geometry'
import { grids, isGridEnabled } from '../core/systems/registry'
import type { Grid, MapTone, SystemOptions } from '../core/systems/types'
import { basemapTone } from './basemaps'
import { CUE_COLOR, cueCellFeatures, cueMarkerFeatures } from './cue'
import { LineRank, labelFeature, lineFeature } from './features'
import { buildRings, ringFeatures, ringStep } from './rings'

export type OverlayInput = Readonly<{
  gridToggles: GridToggles.GridToggles
  isGridLabelsVisible: boolean
  /** What the map shows now, as [west, south, east, north]. */
  bounds: Box
  zoom: number
  maybeCue: Option.Option<LatLon>
  options: SystemOptions
  isRangeRingsVisible: boolean
  ringSpacing: RangeRings.RingSpacing
  ringUnit: RangeRings.RingUnit
  basemap: MapStyle.Basemap
}>

/** What the map's overlay layers show: lines, the cue marker, and labels. */
export type OverlayFrame = Readonly<{
  lines: GeoJSON.FeatureCollection<GeoJSON.LineString>
  cueMarker: GeoJSON.FeatureCollection<GeoJSON.Point>
  labels: GeoJSON.FeatureCollection<GeoJSON.Point>
}>

/** Below this zoom the whole globe can be in view, so grids cover every longitude. */
const WHOLE_WORLD_ZOOM = 2.5

/** Clip the view to the world, and use every longitude when the whole globe can show. */
export const gridBox = ([west, south, east, north]: Box, zoom: number): Box => {
  const isWholeWorld = zoom < WHOLE_WORLD_ZOOM || east - west >= 360
  return [
    isWholeWorld ? -180 : Math.max(-180, west),
    Math.max(-90, south),
    isWholeWorld ? 180 : Math.min(180, east),
    Math.min(90, north),
  ]
}

type BuiltGrid = Readonly<{ grid: Grid; geometry: GridGeometry }>

const MIN_LINE_WIDTH = 0.5

/** Grids later in the registry draw on top, so their lines get the higher rank. */
const gridLineFeatures = (
  built: ReadonlyArray<BuiltGrid>,
  tone: MapTone,
): Array<GeoJSON.Feature<GeoJSON.LineString>> =>
  Array.flatMap(built, ({ grid, geometry }, index) =>
    Array.map(geometry.paths, gridPath =>
      lineFeature(gridPath.path, {
        layer: grid.id,
        color: grid.colors[tone],
        width: Math.max(MIN_LINE_WIDTH, gridPath.width),
        rank: LineRank.Grid + index,
      }),
    ),
  )

/** Grids later in the registry draw on top, so their labels get the lower sort key and win collisions. */
const gridLabelFeatures = (
  built: ReadonlyArray<BuiltGrid>,
  tone: MapTone,
): Array<GeoJSON.Feature<GeoJSON.Point>> =>
  Array.flatMap(built, ({ grid, geometry }, index) =>
    Array.map(geometry.labels, label =>
      labelFeature(label, built.length - index, grid.colors[tone], tone),
    ),
  )

/** Range rings belong to the cue, so they show with grid labels off and their labels outrank grid labels. */
const ringsAroundCue = (input: OverlayInput, tone: MapTone) =>
  Option.match(
    Option.filter(input.maybeCue, () => input.isRangeRingsVisible),
    {
      onNone: () => ({ lines: [], labels: [] }),
      onSome: cue => {
        const rings = buildRings(
          cue,
          ringStep(input.ringSpacing, input.bounds, input.ringUnit),
          input.ringUnit,
        )
        return {
          lines: ringFeatures(rings),
          labels: Array.map(rings, ring =>
            labelFeature(ring.label, 0, CUE_COLOR, tone),
          ),
        }
      },
    },
  )

/** Turn the enabled grids, the cue and its rings into the GeoJSON the map's overlay layers draw. */
export const buildOverlayFrame = (input: OverlayInput): OverlayFrame => {
  const box = gridBox(input.bounds, input.zoom)
  const built = Array.map(
    Array.filter(grids, grid => isGridEnabled(input.gridToggles, grid)),
    grid => ({ grid, geometry: grid.build(box, input.zoom) }),
  )
  const tone = basemapTone[input.basemap]
  const rings = ringsAroundCue(input, tone)
  return {
    lines: {
      type: 'FeatureCollection',
      features: [
        ...gridLineFeatures(built, tone),
        ...rings.lines,
        ...cueCellFeatures(
          input.maybeCue,
          input.options,
          input.gridToggles,
          tone,
        ),
      ],
    },
    cueMarker: {
      type: 'FeatureCollection',
      features: [...cueMarkerFeatures(input.maybeCue)],
    },
    labels: {
      type: 'FeatureCollection',
      features: [
        ...rings.labels,
        ...(input.isGridLabelsVisible ? gridLabelFeatures(built, tone) : []),
      ],
    },
  }
}
