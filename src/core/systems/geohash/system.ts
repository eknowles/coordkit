import { Option, pipe } from 'effect'

import { cellBox } from '../cell'
import { isMgrs } from '../mgrs/mgrs'
import { makeParser } from '../parser'
import type { Formatter, Parser } from '../types'
import { fromGeohash, isGeohash, toGeohash } from './geohash'

const LENGTH = 9
const PREFIX = /^(geohash|gh):\s*/i
const HAS_LETTER = /[a-z]/i

/**
 * The search reads a hash back only if no earlier parser claims it, so a hash made only of
 * digits, or one that is also an MGRS reference (`bjb125858` is south polar zone B, square JB),
 * is copied with the "gh:" prefix.
 */
const isAmbiguous = (hash: string): boolean =>
  !HAS_LETTER.test(hash) || isMgrs(hash)

export const formatter: Formatter = {
  id: 'Geohash',
  label: 'Geohash',
  maybeGridId: Option.none(),
  format: point => {
    const hash = toGeohash(point, LENGTH)
    return {
      lines: [hash, `${LENGTH} characters`],
      copyText: isAmbiguous(hash) ? `gh:${hash}` : hash,
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
