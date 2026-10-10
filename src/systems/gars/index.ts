import { Option } from 'effect'

import { makeParser } from '../parser'
import { singleReading } from '../reading'
import type { Formatter, Grid, Parser } from '../types'
import { type GarsPrecision, fromGars, isGars, toGars } from './gars'
import { garsCellOutline, garsGrid } from './grid'

const cellLabel: Record<GarsPrecision, string> = {
  30: '30′ cell',
  15: '15′ quadrant',
  5: '5′ keypad',
}

export const garsFormatter: Formatter = {
  id: 'GARS',
  label: 'GARS',
  gridId: 'Gars',
  format: (point, { garsPrecision }) => singleReading(toGars(point, garsPrecision), cellLabel[garsPrecision]),
}

export const garsParser: Parser = makeParser('GARS', text => {
  const compact = text.replace(/\s+/g, '').toUpperCase()
  if (!isGars(compact)) return null
  const cell = fromGars(compact)
  return {
    kind: 'GARS',
    point: { lat: (cell.south + cell.north) / 2, lon: (cell.west + cell.east) / 2 },
    bounds: [cell.west, cell.south, cell.east, cell.north],
  }
})

export const garsGridDefinition: Grid = {
  id: 'Gars',
  label: 'GARS',
  description: 'GARS cells, from zoom 4',
  colors: { onDark: [229, 72, 77, 130], onLight: [196, 30, 45, 150] },
  enabledByDefault: false,
  build: garsGrid,
  cueOutline: (point, { garsPrecision }) => Option.some(garsCellOutline(toGars(point, garsPrecision))),
}
