import { Option, Record, Schema } from 'effect'

import { findGrid, isGridEnabled } from '../systems/registry'

/** Grid ids come from the systems registry; a grid missing from the record uses its own default. */
export const GridToggles = Schema.Record(Schema.String, Schema.Boolean)
export type GridToggles = typeof GridToggles.Type

/** Flip one grid. An id the registry does not know leaves the toggles unchanged. */
export const toggle =
  (gridId: string) =>
  (toggles: GridToggles): GridToggles =>
    Option.match(findGrid(gridId), {
      onNone: () => toggles,
      onSome: grid =>
        Record.set(toggles, gridId, !isGridEnabled(toggles, grid)),
    })
