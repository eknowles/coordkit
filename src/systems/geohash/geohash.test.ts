import { Option } from 'effect'
import { expect, test } from 'vitest'

import { fromGeohash, toGeohash } from './geohash'
import { formatter, parser } from './system'

test('encodes and decodes the reference hash', () => {
  expect(toGeohash({ lat: 57.64911, lon: 10.40744 }, 11)).toBe('u4pruydqqvj')
  expect(fromGeohash('u4pruydqqvj').center.lat).toBeCloseTo(57.64911, 4)
})

test('a hash made only of digits is copied with the gh: prefix and reads back', () => {
  const reading = formatter.format(
    { lat: -90, lon: -180 },
    { mgrsPrecision: 5, garsPrecision: 5, tileZoom: 12 },
  )
  expect(reading.copyText).toBe('gh:000000000')
  expect(Option.isSome(parser.parse(reading.copyText))).toBe(true)
  expect(Option.isSome(parser.parse('000000000'))).toBe(false)
})
