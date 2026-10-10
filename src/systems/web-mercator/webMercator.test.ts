import proj4 from 'proj4'
import { expect, test } from 'vitest'

import { fromWebMercator, toWebMercator } from './webMercator'

test('matches proj4 and round-trips', () => {
  const p = { lat: 51.5, lon: -0.12 }
  const [x, y] = proj4('EPSG:4326', 'EPSG:3857', [p.lon, p.lat])
  const wm = toWebMercator(p)
  expect(wm.x).toBeCloseTo(x!, 3)
  expect(wm.y).toBeCloseTo(y!, 3)
  expect(fromWebMercator(wm.x, wm.y).lat).toBeCloseTo(p.lat, 9)
})
