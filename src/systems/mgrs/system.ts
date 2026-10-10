import { Array, Option, pipe } from 'effect'

import { compact, makeParser } from '../parser'
import type { Formatter, Grid, Parser } from '../types'
import { mgrsGrid, mgrsSquareOutline } from './grid'
import { fromMgrs, isMgrs, toMgrs, toMgrsParts } from './mgrs'

export const formatter: Formatter = {
  id: 'MGRS',
  label: 'MGRS',
  maybeGridId: Option.some('Mgrs'),
  format: (point, { mgrsPrecision }) => {
    const parts = toMgrsParts(point, mgrsPrecision)
    const gzd = `${parts.zone ?? ''}${parts.band} ${parts.square}`
    const digits = pipe(
      [parts.easting, parts.northing],
      Array.filter(part => part !== ''),
      Array.join(' '),
    )
    return {
      lines: [gzd, digits === '' ? '100 km square' : digits],
      copyText: digits === '' ? gzd : `${gzd} ${digits}`,
    }
  },
}

export const parser: Parser = makeParser('MGRS', text =>
  pipe(
    compact(text),
    Option.liftPredicate(isMgrs),
    Option.map(reference => ({
      kind: 'MGRS',
      point: fromMgrs(reference).center,
      maybeBounds: Option.none(),
    })),
  ),
)

/** Outline the square at the chosen precision, down to 100 m; finer squares are too small to see. */
const MIN_OUTLINE_PRECISION = 3

export const grid: Grid = {
  id: 'Mgrs',
  label: 'MGRS',
  description: 'MGRS grid lines and squares, from zoom 5',
  colors: { onDark: [76, 139, 245, 130], onLight: [24, 90, 200, 150] },
  isEnabledByDefault: true,
  build: mgrsGrid,
  maybeCueOutline: Option.some((point, { mgrsPrecision }) =>
    pipe(
      mgrsPrecision,
      Option.liftPredicate(precision => precision <= MIN_OUTLINE_PRECISION),
      Option.flatMap(precision =>
        Option.fromNullishOr(mgrsSquareOutline(toMgrs(point, precision))),
      ),
    ),
  ),
}
