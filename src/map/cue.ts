/** The cue marker and the outlines of the cells that contain it. */
import type { Layer } from '@deck.gl/core'
import { PathLayer, ScatterplotLayer } from '@deck.gl/layers'
import { Array, Option } from 'effect'

import type { LatLon } from '../geo/ellipsoid'
import type { Position, RGBA } from '../geo/geometry'
import { grids } from '../systems/registry'
import type { MapTone, SystemOptions } from '../systems/types'
import { onTop } from './layerDefaults'

export const CUE_COLOR: RGBA = [245, 166, 35, 255]

type Outline = Readonly<{ path: ReadonlyArray<Position>; color: RGBA }>

const opaque = ([r, g, b]: RGBA): RGBA => [r, g, b, 255]

const outlinesAround = (cue: LatLon, options: SystemOptions, tone: MapTone): ReadonlyArray<Outline> =>
  Array.getSomes(
    Array.map(grids, grid =>
      Option.map(Option.flatMap(Option.fromNullishOr(grid.cueOutline), outline => outline(cue, options)), path => ({
        path,
        color: opaque(grid.colors[tone]),
      })),
    ),
  )

export const cueLayers = (maybeCue: Option.Option<LatLon>, options: SystemOptions, tone: MapTone): ReadonlyArray<Layer> =>
  Option.match(maybeCue, {
    onNone: () => [],
    onSome: cue => [
      new PathLayer<Outline>({
        ...onTop,
        id: 'cue-cells',
        data: outlinesAround(cue, options, tone),
        getPath: outline => outline.path as Array<Position>,
        getColor: outline => outline.color,
        getWidth: 2.5,
        widthUnits: 'pixels',
      }),
      new ScatterplotLayer<LatLon>({
        ...onTop,
        id: 'cue-ring',
        data: [cue],
        getPosition: point => [point.lon, point.lat],
        getRadius: 7,
        radiusUnits: 'pixels',
        filled: false,
        stroked: true,
        getLineColor: CUE_COLOR,
        getLineWidth: 3,
        lineWidthUnits: 'pixels',
      }),
      new ScatterplotLayer<LatLon>({
        ...onTop,
        id: 'cue-centre',
        data: [cue],
        getPosition: point => [point.lon, point.lat],
        getRadius: 2,
        radiusUnits: 'pixels',
        getFillColor: CUE_COLOR,
      }),
    ],
  })
