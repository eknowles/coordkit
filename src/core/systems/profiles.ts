/**
 * Profiles for the three domains in AGeoP-21 Table B-1: Land, Maritime and Air. A profile picks
 * which grids are on when it is chosen, which readout columns and toolbar switches come first,
 * and which grids draw on top. Like the registry, this file may name systems.
 */
import { Array, Record, Schema, pipe } from 'effect'

import { formatters, grids } from './registry'
import type { Formatter, Grid } from './types'

export const ProfileId = Schema.Literals(['Land', 'Maritime', 'Air'])
export type ProfileId = typeof ProfileId.Type

export const DEFAULT_PROFILE: ProfileId = 'Land'

export interface Profile {
  readonly id: ProfileId
  readonly description: string
  /** Readout columns that come first, in this order; the rest keep registry order. */
  readonly leadingFormatterIds: ReadonlyArray<string>
  /** Toolbar switches that come first, in this order. These grids also draw on top, the first highest. */
  readonly leadingGridIds: ReadonlyArray<string>
  /** The grids that are on when the profile is chosen; every other grid is off. */
  readonly enabledGridIds: ReadonlyArray<string>
}

export const profiles: Record<ProfileId, Profile> = {
  // AGeoP-21 1.2.5: MGRS is the preferred position reporting system for ground forces.
  Land: {
    id: 'Land',
    description: 'MGRS and UTM first, with UTM zones and the MGRS grid',
    leadingFormatterIds: ['MGRS', 'UTM'],
    leadingGridIds: ['Mgrs', 'Gzd'],
    enabledGridIds: ['Graticule', 'Gzd', 'Mgrs'],
  },
  // AGeoP-21 B.6.6: nautical charts carry the military grid as edge ticks, not lines.
  Maritime: {
    id: 'Maritime',
    description:
      'Degrees and minutes and GARS first, with the chart grid and MGRS as edge ticks',
    leadingFormatterIds: ['DDM', 'GARS', 'MGRS'],
    leadingGridIds: ['Ddm', 'Gars', 'MgrsTicks'],
    enabledGridIds: ['Ddm', 'Gars', 'MgrsTicks'],
  },
  // AGeoP-21 B.7.2: GEOREF on aeronautical charts, GARS for deconfliction.
  Air: {
    id: 'Air',
    description: 'GEOREF and GARS first, with their grids and the graticule',
    leadingFormatterIds: ['GEOREF', 'GARS', 'MGRS', 'DDM'],
    leadingGridIds: ['Georef', 'Gars'],
    enabledGridIds: ['Graticule', 'Georef', 'Gars'],
  },
}

/** The items whose ids are listed first, in that order, then the rest in their own order. */
const leadingFirst = <A extends { readonly id: string }>(
  items: ReadonlyArray<A>,
  leadingIds: ReadonlyArray<string>,
): ReadonlyArray<A> => [
  ...Array.getSomes(
    Array.map(leadingIds, id => Array.findFirst(items, item => item.id === id)),
  ),
  ...Array.filter(items, item => !leadingIds.includes(item.id)),
]

/** Readout columns, left to right. */
export const formattersFor = (profileId: ProfileId): ReadonlyArray<Formatter> =>
  leadingFirst(formatters, profiles[profileId].leadingFormatterIds)

/** Toolbar switches, left to right. */
export const gridSwitchesFor = (profileId: ProfileId): ReadonlyArray<Grid> =>
  leadingFirst(grids, profiles[profileId].leadingGridIds)

/** Drawing order: the other grids in registry order, then the profile's grids with its first on top. */
export const gridDrawOrderFor = (profileId: ProfileId): ReadonlyArray<Grid> => {
  const { leadingGridIds } = profiles[profileId]
  return [
    ...Array.filter(grids, grid => !leadingGridIds.includes(grid.id)),
    ...Array.reverse(
      Array.getSomes(
        Array.map(leadingGridIds, id =>
          Array.findFirst(grids, grid => grid.id === id),
        ),
      ),
    ),
  ]
}

/** The toggle for every grid when the profile is chosen. */
export const gridTogglesFor = (profileId: ProfileId): Record<string, boolean> =>
  pipe(
    grids,
    Array.map((grid): readonly [string, boolean] => [
      grid.id,
      profiles[profileId].enabledGridIds.includes(grid.id),
    ]),
    Record.fromEntries,
  )
