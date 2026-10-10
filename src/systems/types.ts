/**
 * Capabilities a coordinate system can offer. A system implements only the ones it supports:
 * DD formats and parses but draws no grid; the graticule only draws a grid.
 */
import type { Option } from 'effect'

import type { LatLon } from '../geo/ellipsoid'
import type { Box, GridGeometry, Position, RGBA } from '../geo/geometry'
import type { GarsPrecision } from './gars/gars'
import type { MgrsPrecision } from './mgrs/mgrs'

export type SystemOptions = Readonly<{
  mgrsPrecision: MgrsPrecision
  garsPrecision: GarsPrecision
}>

/** A position in one system: two display lines and the text to copy. */
export type Reading = Readonly<{
  lines: readonly [string, string]
  copyText: string
}>

export interface Formatter {
  readonly id: string
  readonly label: string
  /** The grid that draws this system on the map; its colour marks the readout column. */
  readonly gridId?: string
  readonly format: (point: LatLon, options: SystemOptions) => Reading
}

export type Bounds = readonly [west: number, south: number, east: number, north: number]

export interface ParseResult {
  readonly kind: string
  readonly point: LatLon
  /** The area the reference covers, when it names a cell rather than a point. */
  readonly bounds?: Bounds
}

export interface Parser {
  readonly label: string
  readonly parse: (text: string) => Option.Option<ParseResult>
}

/** Line and label colours for dark base maps (Dark, Satellite) and for the Light base map. */
export type GridColors = Readonly<{ onDark: RGBA; onLight: RGBA }>

export type MapTone = keyof GridColors

export interface Grid {
  readonly id: string
  /** Short name for a toolbar toggle. */
  readonly label: string
  /** What the toggle shows, including when the grid appears. */
  readonly description: string
  readonly colors: GridColors
  readonly enabledByDefault: boolean
  readonly build: (view: Box, zoom: number) => GridGeometry
  /** Outline of the cell or square that contains a point, drawn around the cue. */
  readonly cueOutline?: (point: LatLon, options: SystemOptions) => Option.Option<ReadonlyArray<Position>>
}
