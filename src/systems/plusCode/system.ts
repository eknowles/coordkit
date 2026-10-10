import { Option, pipe } from 'effect'

import { cellBox } from '../cell'
import { compact, makeParser } from '../parser'
import { singleReading } from '../reading'
import type { Formatter, Grid, Parser } from '../types'
import { plusCodeCellOutline, plusCodeGrid } from './grid'
import { fromPlusCode, isFullPlusCode, toPlusCode } from './plusCode'

export const formatter: Formatter = {
  id: 'PlusCode',
  label: 'Plus Code',
  maybeGridId: Option.some('PlusCode'),
  format: point => singleReading(toPlusCode(point), 'about 14 m'),
}

export const parser: Parser = makeParser('Plus Code', text =>
  pipe(
    compact(text),
    Option.liftPredicate(isFullPlusCode),
    Option.map(code => {
      const cell = fromPlusCode(code)
      return {
        kind: 'Plus Code',
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
  id: 'PlusCode',
  label: 'Plus Codes',
  description: 'Plus Code cells, finer as you zoom in',
  colors: { onDark: [190, 140, 255, 140], onLight: [120, 60, 200, 160] },
  isEnabledByDefault: false,
  build: plusCodeGrid,
  maybeCueOutline: Option.some(point =>
    Option.some(plusCodeCellOutline(toPlusCode(point))),
  ),
}
