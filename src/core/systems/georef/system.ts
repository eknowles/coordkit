import { Option, pipe } from 'effect'

import { cellBox } from '../cell'
import { compact, makeParser } from '../parser'
import { singleReading } from '../reading'
import type { Formatter, Grid, Parser } from '../types'
import { fromGeoref, isGeoref, toGeoref } from './georef'
import { georefCellOutline, georefGrid } from './grid'

export const formatter: Formatter = {
  id: 'GEOREF',
  label: 'GEOREF',
  maybeGridId: Option.some('Georef'),
  format: point => singleReading(toGeoref(point), '1′ square'),
}

export const parser: Parser = makeParser('GEOREF', text =>
  pipe(
    compact(text),
    Option.liftPredicate(isGeoref),
    Option.map(reference => {
      const cell = fromGeoref(reference)
      return {
        kind: 'GEOREF',
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
  id: 'Georef',
  label: 'GEOREF',
  description: 'GEOREF 15° quadrangles, and 1° squares from zoom 6',
  colors: { onDark: [64, 196, 160, 140], onLight: [0, 128, 100, 160] },
  isEnabledByDefault: false,
  build: georefGrid,
  maybeCueOutline: Option.some(point =>
    Option.some(georefCellOutline(toGeoref(point))),
  ),
}
