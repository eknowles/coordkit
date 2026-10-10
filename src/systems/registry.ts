/**
 * The coordinate systems the app knows about. To add a system, give it a folder that exports
 * a Formatter, Parser or Grid, then list it here. Nothing else in the app names a system.
 */
import { Array, Option } from 'effect'

import { ddFormatter, ddmFormatter, dmsFormatter, latLonParser } from './angles'
import { ecefFormatter } from './ecef'
import { garsFormatter, garsGridDefinition, garsParser } from './gars'
import { geohashFormatter, geohashParser } from './geohash'
import { graticuleGridDefinition } from './graticule'
import { maidenheadFormatter, maidenheadParser } from './maidenhead'
import { mgrsFormatter, mgrsGridDefinition, mgrsParser } from './mgrs'
import type { Formatter, Grid, ParseResult, Parser } from './types'
import { gzdGridDefinition, upsParser, utmFormatter, utmParser } from './utm'
import { webMercatorFormatter } from './web-mercator'

/** Readout columns, left to right. */
export const formatters: ReadonlyArray<Formatter> = [
  ddFormatter,
  dmsFormatter,
  ddmFormatter,
  utmFormatter,
  mgrsFormatter,
  garsFormatter,
  geohashFormatter,
  maidenheadFormatter,
  webMercatorFormatter,
  ecefFormatter,
]

/** Tried in order; the first match wins. Geohash is last because it accepts the most text. */
export const parsers: ReadonlyArray<Parser> = [
  utmParser,
  upsParser,
  garsParser,
  mgrsParser,
  maidenheadParser,
  latLonParser,
  geohashParser,
]

/** Drawn in order, so later grids sit on top; their labels win collisions. */
export const grids: ReadonlyArray<Grid> = [graticuleGridDefinition, garsGridDefinition, gzdGridDefinition, mgrsGridDefinition]

export const parseCoordinate = (text: string): Option.Option<ParseResult> =>
  Array.findFirst(parsers, parser => parser.parse(text))

export const isGridEnabled = (enabled: Readonly<Record<string, boolean>>, grid: Grid): boolean =>
  enabled[grid.id] ?? grid.enabledByDefault

export const defaultGridToggles = (): Record<string, boolean> =>
  Object.fromEntries(Array.map(grids, grid => [grid.id, grid.enabledByDefault]))

export const findGrid = (gridId: string): Option.Option<Grid> => Array.findFirst(grids, grid => grid.id === gridId)
