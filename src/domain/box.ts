import { Schema } from 'effect'

import type * as Geometry from '../geo/geometry'

/** An area as [west, south, east, north] in degrees, the same tuple the grids use. */
export const Box = Schema.Tuple([
  Schema.Number,
  Schema.Number,
  Schema.Number,
  Schema.Number,
])
export type Box = typeof Box.Type

// NOTE: compile-time check that this Schema and the geometry layer's Box stay the same shape.
export const toGeometry = (box: Box): Geometry.Box => box
