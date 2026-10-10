import { Option } from 'effect'

import { makeParser } from '../parser'
import type { Formatter, Grid, Parser } from '../types'
import { mgrsGrid, mgrsSquareOutline } from './grid'
import { fromMgrs, isMgrs, toMgrs, toMgrsParts } from './mgrs'

export const mgrsFormatter: Formatter = {
  id: 'MGRS',
  label: 'MGRS',
  gridId: 'Mgrs',
  format: (point, { mgrsPrecision }) => {
    const parts = toMgrsParts(point, mgrsPrecision)
    const gzd = `${parts.zone ?? ''}${parts.band} ${parts.square}`
    const digits = [parts.easting, parts.northing].filter(Boolean).join(' ')
    return {
      lines: [gzd, digits || '100 km square'],
      copyText: [gzd, digits].filter(Boolean).join(' '),
    }
  },
}

export const mgrsParser: Parser = makeParser('MGRS', text => {
  const compact = text.replace(/\s+/g, '').toUpperCase()
  return isMgrs(compact) ? { kind: 'MGRS', point: fromMgrs(compact).center } : null
})

/** Outline the square at the chosen precision, down to 100 m; finer squares are too small to see. */
const MIN_OUTLINE_PRECISION = 3

export const mgrsGridDefinition: Grid = {
  id: 'Mgrs',
  label: 'MGRS',
  description: 'MGRS grid lines and squares, from zoom 5',
  colors: { onDark: [76, 139, 245, 130], onLight: [24, 90, 200, 150] },
  enabledByDefault: true,
  build: mgrsGrid,
  cueOutline: (point, { mgrsPrecision }) =>
    mgrsPrecision <= MIN_OUTLINE_PRECISION
      ? Option.fromNullishOr(mgrsSquareOutline(toMgrs(point, mgrsPrecision)))
      : Option.none(),
}
