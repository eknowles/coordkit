import { expect, test } from 'vitest'

import { fromMaidenhead, toMaidenhead } from './maidenhead'

test('encodes and decodes a locator', () => {
  expect(toMaidenhead({ lat: 51.5073509, lon: -0.1277583 }, 3)).toBe('IO91wm')
  expect(fromMaidenhead('IO91wm').center.lat).toBeCloseTo(51.52, 1)
})
