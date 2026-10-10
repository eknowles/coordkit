/** The readout's columns: one per registered formatter, keyed to the grid that draws it. */
import { Array, Option } from 'effect'

import { findGrid, formatters } from '../systems/registry'
import type { Formatter, Grid } from '../systems/types'

export type ReadoutColumn = Readonly<{ formatter: Formatter; maybeGrid: Option.Option<Grid> }>

export const columns: ReadonlyArray<ReadoutColumn> = Array.map(formatters, formatter => ({
  formatter,
  maybeGrid: Option.flatMap(Option.fromNullishOr(formatter.gridId), findGrid),
}))
