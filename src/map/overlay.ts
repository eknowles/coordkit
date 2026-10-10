/** Turn the enabled grids into deck.gl path layers and MapLibre label features. */
import type { Layer } from '@deck.gl/core'
import { PathLayer } from '@deck.gl/layers'
import { Array, Option } from 'effect'

import type { Basemap, MapView, RingSpacing, RingUnit } from '../app/domain'
import type { LatLon } from '../geo/ellipsoid'
import type { Box, GridGeometry, GridLabel, GridPath, RGBA } from '../geo/geometry'
import { grids, isGridEnabled } from '../systems/registry'
import type { Grid, MapTone, SystemOptions } from '../systems/types'
import { basemapTone } from './basemaps'
import { CUE_COLOR } from './cue'
import { cueLayers } from './cue'
import { labelHalo } from './labels'
import { onTop } from './layerDefaults'
import { buildRings, ringLayer, ringStep } from './rings'

export type OverlayInput = Readonly<{
  gridToggles: Readonly<Record<string, boolean>>
  showLabels: boolean
  view: MapView
  maybeCue: Option.Option<LatLon>
  options: SystemOptions
  showRings: boolean
  ringSpacing: RingSpacing
  ringUnit: RingUnit
  basemap: Basemap
}>

export type OverlayFrame = Readonly<{
  layers: ReadonlyArray<Layer>
  labels: GeoJSON.FeatureCollection
}>

/** Below this zoom the whole globe can be in view, so grids cover every longitude. */
const WHOLE_WORLD_ZOOM = 2.5

const viewBox = ({ bounds, zoom }: MapView): Box => {
  const isWholeWorld = zoom < WHOLE_WORLD_ZOOM || bounds.east - bounds.west >= 360
  return [
    isWholeWorld ? -180 : Math.max(-180, bounds.west),
    Math.max(-90, bounds.south),
    isWholeWorld ? 180 : Math.min(180, bounds.east),
    Math.min(90, bounds.north),
  ]
}

type BuiltGrid = Readonly<{ grid: Grid; geometry: GridGeometry }>

const pathLayer = ({ grid, geometry }: BuiltGrid, tone: MapTone): Layer =>
  new PathLayer<GridPath>({
    ...onTop,
    id: `${grid.id}-paths`,
    data: geometry.paths,
    getPath: gridPath => gridPath.path,
    getColor: grid.colors[tone],
    updateTriggers: { getColor: tone },
    getWidth: gridPath => gridPath.width,
    widthUnits: 'pixels',
    widthMinPixels: 0.5,
  })

const labelFeature = (label: GridLabel, rank: number, color: RGBA, tone: MapTone): GeoJSON.Feature => ({
  type: 'Feature',
  geometry: { type: 'Point', coordinates: label.position },
  properties: { text: label.text, size: label.size, rank, color: `rgb(${color.slice(0, 3).join(',')})`, halo: labelHalo[tone] },
})

/** Grids later in the registry draw on top, so their labels get the lower sort key and win collisions. */
const gridLabelFeatures = (built: ReadonlyArray<BuiltGrid>, tone: MapTone): Array<GeoJSON.Feature> =>
  Array.flatMap(built, ({ grid, geometry }, index) =>
    Array.map(geometry.labels, label => labelFeature(label, built.length - index, grid.colors[tone], tone)),
  )

/** Range rings belong to the cue, so they show with grid labels off and their labels outrank grid labels. */
const ringsAroundCue = (input: OverlayInput, tone: MapTone) =>
  Option.match(
    Option.filter(input.maybeCue, () => input.showRings),
    {
      onNone: () => ({ layers: [], labels: [] }),
      onSome: cue => {
        const rings = buildRings(cue, ringStep(input.ringSpacing, input.view, input.ringUnit), input.ringUnit)
        return { layers: [ringLayer(rings)], labels: Array.map(rings, ring => labelFeature(ring.label, 0, CUE_COLOR, tone)) }
      },
    },
  )

export const buildOverlayFrame = (input: OverlayInput): OverlayFrame => {
  const box = viewBox(input.view)
  const built = Array.map(
    Array.filter(grids, grid => isGridEnabled(input.gridToggles, grid)),
    grid => ({ grid, geometry: grid.build(box, input.view.zoom) }),
  )
  const tone = basemapTone[input.basemap]
  const rings = ringsAroundCue(input, tone)
  return {
    layers: [
      ...Array.map(built, grid => pathLayer(grid, tone)),
      ...rings.layers,
      ...cueLayers(input.maybeCue, input.options, tone),
    ],
    labels: {
      type: 'FeatureCollection',
      features: [...rings.labels, ...(input.showLabels ? gridLabelFeatures(built, tone) : [])],
    },
  }
}
