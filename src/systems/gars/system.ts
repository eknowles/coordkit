import { Option, pipe } from 'effect'

import { cellBox } from '../cell'
import { compact, makeParser } from '../parser'
import { singleReading } from '../reading'
import type { Formatter, Grid, Parser } from '../types'
import { fromGars, isGars, toGars } from './gars'
import { garsCellOutline, garsGrid } from './grid'
import type { GarsPrecision } from './precision'

const cellLabel: Record<GarsPrecision, string> = {
  30: '30′ cell',
  15: '15′ quadrant',
  5: '5′ keypad',
}

export const formatter: Formatter = {
  id: 'GARS',
  label: 'GARS',
  maybeGridId: Option.some('Gars'),
  format: (point, { garsPrecision }) =>
    singleReading(toGars(point, garsPrecision), cellLabel[garsPrecision]),
}

export const parser: Parser = makeParser('GARS', text =>
  pipe(
    compact(text),
    Option.liftPredicate(isGars),
    Option.map(reference => {
      const cell = fromGars(reference)
      return {
        kind: 'GARS',
        point: {
          lat: (cell.south + cell.north) / 2,
          lon: (cell.west + cell.east) / 2,
        },
        maybeBounds: Option.some(cellBox(cell)),
      }
    }),
  ),
)

export const grid: Grid = {
  id: 'Gars',
  label: 'GARS',
  description: 'GARS cells, from zoom 4',
  colors: { onDark: [229, 72, 77, 130], onLight: [196, 30, 45, 150] },
  isEnabledByDefault: false,
  build: garsGrid,
  maybeCueOutline: Option.some((point, { garsPrecision }) =>
    Option.some(garsCellOutline(toGars(point, garsPrecision))),
  ),
}
