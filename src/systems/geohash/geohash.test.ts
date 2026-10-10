import { expect, test } from 'vitest'

import { fromGeohash, toGeohash } from './geohash'

test('encodes and decodes the reference hash', () => {
  expect(toGeohash({ lat: 57.64911, lon: 10.40744 }, 11)).toBe('u4pruydqqvj')
  expect(fromGeohash('u4pruydqqvj').center.lat).toBeCloseTo(57.64911, 4)
})
