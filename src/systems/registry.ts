/**
 * The coordinate systems the app knows about. To add a system, give it a folder that exports
 * a Formatter, Parser or Grid, then list it here. Nothing else in the app names a system.
 */
import { Array, Option, Record, pipe } from 'effect'

import * as Angles from './angles'
import * as Ecef from './ecef'
import * as Gars from './gars'
import * as Geohash from './geohash'
import * as Georef from './georef'
import * as Graticule from './graticule'
import * as Maidenhead from './maidenhead'
import * as Mgrs from './mgrs'
import * as PlusCode from './plusCode'
import * as Tile from './tile'
import type { Formatter, Grid, ParseResult, Parser } from './types'
import * as Utm from './utm'
import * as WebMercator from './webMercator'

/** Readout columns, left to right. */
export const formatters: ReadonlyArray<Formatter> = [
  Angles.ddFormatter,
  Angles.dmsFormatter,
  Angles.ddmFormatter,
  Utm.formatter,
  Mgrs.formatter,
  Gars.formatter,
  Georef.formatter,
  PlusCode.formatter,
  Geohash.formatter,
  Maidenhead.formatter,
  Tile.formatter,
  WebMercator.formatter,
  Ecef.formatter,
]

/**
 * Tried in order; the first match wins. GEOREF comes before Geohash, whose alphabet accepts
 * GEOREF letters, and Geohash is last because it accepts the most text.
 */
export const parsers: ReadonlyArray<Parser> = [
  Utm.utmParser,
  Utm.upsParser,
  Gars.parser,
  Mgrs.parser,
  Maidenhead.parser,
  PlusCode.parser,
  Tile.parser,
  Angles.parser,
  Georef.parser,
  Geohash.parser,
]

/** Drawn in order, so later grids sit on top; their labels win collisions. */
export const grids: ReadonlyArray<Grid> = [
  Graticule.grid,
  Tile.grid,
  PlusCode.grid,
  Georef.grid,
  Gars.grid,
  Utm.grid,
  Mgrs.grid,
]

export const parseCoordinate = (text: string): Option.Option<ParseResult> =>
  Array.findFirst(parsers, parser => parser.parse(text))

/** Whether a grid is on; a grid the toggles do not list (newer than saved settings) uses its default. */
export const isGridEnabled = (
  toggles: Readonly<Record<string, boolean>>,
  grid: Grid,
): boolean =>
  Option.getOrElse(Record.get(toggles, grid.id), () => grid.isEnabledByDefault)

export const defaultGridToggles = (): Record<string, boolean> =>
  pipe(
    grids,
    Array.map((grid): readonly [string, boolean] => [
      grid.id,
      grid.isEnabledByDefault,
    ]),
    Record.fromEntries,
  )

export const findGrid = (gridId: string): Option.Option<Grid> =>
  Array.findFirst(grids, ({ id }) => id === gridId)
