import { Schema } from 'effect'

/** Digits per axis: 5 = 1 m, 4 = 10 m, 3 = 100 m, 2 = 1 km, 1 = 10 km, 0 = 100 km. */
export const MgrsPrecision = Schema.Literals([5, 4, 3, 2, 1, 0])
export type MgrsPrecision = typeof MgrsPrecision.Type
