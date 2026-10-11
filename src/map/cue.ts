import { Array, Option } from 'effect'

import type { GridToggles } from '../core/domain'
import type { LatLon } from '../core/geo/ellipsoid'
import type { RGBA } from '../core/geo/geometry'
import { grids, isGridEnabled } from '../core/systems/registry'
import type { MapTone, SystemOptions } from '../core/systems/types'
import { LineRank, lineFeature } from './features'

export const CUE_COLOR: RGBA = [245, 166, 35, 255]

const CUE_CELL_WIDTH = 2.5

const opaque = ([red, green, blue]: RGBA): RGBA => [red, green, blue, 255]

/** The outline of the cell around the cue in each grid that is switched on. */
export const cueCellFeatures = (
  maybeCue: Option.Option<LatLon>,
  options: SystemOptions,
  gridToggles: GridToggles.GridToggles,
  tone: MapTone,
): ReadonlyArray<GeoJSON.Feature<GeoJSON.LineString>> =>
  Option.match(maybeCue, {
    onNone: () => [],
    onSome: cue =>
      Array.getSomes(
        Array.map(
          Array.filter(grids, grid => isGridEnabled(gridToggles, grid)),
          grid =>
            Option.map(
              Option.flatMap(grid.maybeCueOutline, outline =>
                outline(cue, options),
              ),
              path =>
                lineFeature(path, {
                  layer: 'cue-cells',
                  color: opaque(grid.colors[tone]),
                  width: CUE_CELL_WIDTH,
                  rank: LineRank.CueCells,
                }),
            ),
        ),
      ),
  })

/** The cue as a point, for the marker's circle layers. */
export const cueMarkerFeatures = (
  maybeCue: Option.Option<LatLon>,
): ReadonlyArray<GeoJSON.Feature<GeoJSON.Point>> =>
  Option.match(maybeCue, {
    onNone: () => [],
    onSome: ({ lat, lon }) => [
      {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [lon, lat] },
        properties: {},
      },
    ],
  })
