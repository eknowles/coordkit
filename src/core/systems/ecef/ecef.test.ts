import proj4 from 'proj4'
import { expect, test } from 'vitest'

import { toEcef } from './ecef'

test('matches proj4', () => {
  const p = { lat: 51.5, lon: -0.12 }
  const [x, y, z] = proj4('EPSG:4326', '+proj=geocent +datum=WGS84 +units=m', [
    p.lon,
    p.lat,
    0,
  ])
  const ecef = toEcef(p)
  expect(ecef.x).toBeCloseTo(x!, 3)
  expect(ecef.y).toBeCloseTo(y!, 3)
  expect(ecef.z).toBeCloseTo(z!, 3)
})
