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

test('a hash that is also an MGRS reference is copied with the gh: prefix', () => {
  const options = { mgrsPrecision: 5, garsPrecision: 5, tileZoom: 12 } as const
  const reading = formatter.format(
    { lat: 77.58333333333333, lon: -180 },
    options,
  )
  expect(reading.lines[0]).toBe('bjb125858')
  expect(reading.copyText).toBe('gh:bjb125858')
  expect(
    formatter.format({ lat: 51.5073509, lon: -0.1277583 }, options).copyText,
  ).toBe('gcpvj0dup')
})
