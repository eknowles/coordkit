import { Array, Option } from 'effect'

import { findGrid, formatters } from '../systems/registry'
import type { Formatter, Grid } from '../systems/types'

export type ReadoutColumn = Readonly<{
  formatter: Formatter
  maybeGrid: Option.Option<Grid>
}>

/** The readout's columns: one per registered formatter, keyed to the grid that draws it. */
export const columns: ReadonlyArray<ReadoutColumn> = Array.map(
  formatters,
  formatter => ({
    formatter,
    maybeGrid: Option.flatMap(formatter.maybeGridId, findGrid),
  }),
)
