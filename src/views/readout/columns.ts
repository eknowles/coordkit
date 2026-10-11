import { Array, Option } from 'effect'

import { type ProfileId, formattersFor } from '../../core/systems/profiles'
import { findGrid } from '../../core/systems/registry'
import type { Formatter, Grid } from '../../core/systems/types'

export type ReadoutColumn = Readonly<{
  formatter: Formatter
  maybeGrid: Option.Option<Grid>
}>

/** The readout's columns: one per registered formatter, in the profile's order, keyed to the grid that draws it. */
export const columnsFor = (
  profileId: ProfileId,
): ReadonlyArray<ReadoutColumn> =>
  Array.map(formattersFor(profileId), formatter => ({
    formatter,
    maybeGrid: Option.flatMap(formatter.maybeGridId, findGrid),
  }))
