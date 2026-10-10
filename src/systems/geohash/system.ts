import { Option, pipe } from 'effect'

import { cellBox } from '../cell'
import { makeParser } from '../parser'
import type { Formatter, Parser } from '../types'
import { fromGeohash, isGeohash, toGeohash } from './geohash'

const LENGTH = 9
const PREFIX = /^(geohash|gh):\s*/i
const HAS_LETTER = /[a-z]/i

/** A hash made only of digits is copied with the "gh:" prefix, so the search can read it back. */
export const formatter: Formatter = {
  id: 'Geohash',
  label: 'Geohash',
  maybeGridId: Option.none(),
  format: point => {
    const hash = toGeohash(point, LENGTH)
    return {
      lines: [hash, `${LENGTH} characters`],
      copyText: HAS_LETTER.test(hash) ? hash : `gh:${hash}`,
    }
  },
}

/** Accepts "gh:u4pr", or a bare hash with at least one letter, so plain numbers stay with other parsers. */
export const parser: Parser = makeParser('Geohash', text =>
  pipe(
    text,
    Option.liftPredicate(input => PREFIX.test(input) || HAS_LETTER.test(input)),
    Option.map(input => input.replace(PREFIX, '')),
    Option.filter(isGeohash),
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
