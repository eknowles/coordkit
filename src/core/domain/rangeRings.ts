import { Schema } from 'effect'

/** Ring spacing in the ring unit, as a string so the select can carry it. */
export const RingSpacing = Schema.Literals([
  'Auto',
  '0.25',
  '0.5',
  '1',
  '2',
  '5',
  '10',
  '25',
  '50',
  '100',
])
export type RingSpacing = typeof RingSpacing.Type

export const RingUnit = Schema.Literals(['NauticalMiles', 'Kilometres'])
export type RingUnit = typeof RingUnit.Type
