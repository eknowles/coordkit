import { makeParser } from '../parser'
import { singleReading } from '../reading'
import type { Formatter, Parser } from '../types'
import { fromMaidenhead, isMaidenhead, toMaidenhead } from './maidenhead'

const PAIRS = 4

export const maidenheadFormatter: Formatter = {
  id: 'Maidenhead',
  label: 'Maidenhead',
  format: point => singleReading(toMaidenhead(point, PAIRS), `${PAIRS * 2} characters`),
}

export const maidenheadParser: Parser = makeParser('Maidenhead', text => {
  const compact = text.replace(/\s+/g, '')
  if (compact.length < 4 || !isMaidenhead(compact)) return null
  const cell = fromMaidenhead(compact)
  return { kind: 'Maidenhead', point: cell.center, bounds: [cell.west, cell.south, cell.east, cell.north] }
})
