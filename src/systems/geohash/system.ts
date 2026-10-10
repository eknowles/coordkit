import { Option, pipe } from 'effect'

import { cellBox } from '../cell'
import { makeParser } from '../parser'
import { singleReading } from '../reading'
import type { Formatter, Parser } from '../types'
import { fromGeohash, isGeohash, toGeohash } from './geohash'

const LENGTH = 9
const PREFIX = /^(geohash|gh):\s*/i
const HAS_LETTER = /[a-z]/i

export const formatter: Formatter = {
  id: 'Geohash',
  label: 'Geohash',
  maybeGridId: Option.none(),
  format: point =>
    singleReading(toGeohash(point, LENGTH), `${LENGTH} characters`),
}

/** Accepts "gh:u4pr" or a bare hash with at least one letter, so plain numbers stay with other parsers. */
export const parser: Parser = makeParser('Geohash', text =>
  pipe(
    text.replace(PREFIX, ''),
    Option.liftPredicate(hash => isGeohash(hash) && HAS_LETTER.test(hash)),
    Option.map(hash => {
      const cell = fromGeohash(hash)
      return {
        kind: 'Geohash',
        point: cell.center,
        maybeBounds: Option.some(cellBox(cell)),
      }
    }),
  ),
)
