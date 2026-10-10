import { makeParser } from '../parser'
import { singleReading } from '../reading'
import type { Formatter, Parser } from '../types'
import { fromGeohash, isGeohash, toGeohash } from './geohash'

const LENGTH = 9

export const geohashFormatter: Formatter = {
  id: 'Geohash',
  label: 'Geohash',
  format: point => singleReading(toGeohash(point, LENGTH), `${LENGTH} characters`),
}

/** Accepts "gh:u4pr" or a bare hash with at least one letter, so plain numbers stay with other parsers. */
export const geohashParser: Parser = makeParser('Geohash', text => {
  const hash = text.replace(/^(geohash|gh):\s*/i, '')
  if (!isGeohash(hash) || !/[a-z]/i.test(hash)) return null
  const cell = fromGeohash(hash)
  return { kind: 'Geohash', point: cell.center, bounds: [cell.west, cell.south, cell.east, cell.north] }
})
