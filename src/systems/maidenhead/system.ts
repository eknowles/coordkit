import { Option, pipe } from 'effect'

import { cellBox } from '../cell'
import { makeParser } from '../parser'
import { singleReading } from '../reading'
import type { Formatter, Parser } from '../types'
import { fromMaidenhead, isMaidenhead, toMaidenhead } from './maidenhead'

const PAIRS = 4
const MIN_LOCATOR_LENGTH = 4

export const formatter: Formatter = {
  id: 'Maidenhead',
  label: 'Maidenhead',
  maybeGridId: Option.none(),
  format: point =>
    singleReading(toMaidenhead(point, PAIRS), `${PAIRS * 2} characters`),
}

export const parser: Parser = makeParser('Maidenhead', text =>
  pipe(
    text.replace(/\s+/g, ''),
    Option.liftPredicate(
      locator => locator.length >= MIN_LOCATOR_LENGTH && isMaidenhead(locator),
    ),
    Option.map(locator => {
      const cell = fromMaidenhead(locator)
      return {
        kind: 'Maidenhead',
        point: cell.center,
        maybeBounds: Option.some(cellBox(cell)),
      }
    }),
  ),
)
