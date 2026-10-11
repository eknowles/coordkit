import { Schema } from 'effect'

/** Cell size in minutes: the 30′ cell, its 15′ quadrant, or a 5′ keypad square. */
export const GarsPrecision = Schema.Literals([5, 15, 30])
export type GarsPrecision = typeof GarsPrecision.Type
