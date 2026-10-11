import { describe, expect, test } from 'vitest'

import { destination } from './geodesic'

const dms = (d: number, m: number, s: number) =>
  Math.sign(d) * (Math.abs(d) + m / 60 + s / 3600)

describe('destination', () => {
  test("matches Vincenty's Flinders Peak to Buninyong reference", () => {
    const flindersPeak = {
      lat: dms(-37, 57, 3.7203),
      lon: dms(144, 25, 29.5244),
    }
    const result = destination(flindersPeak, dms(306, 52, 5.37), 54972.271)
    expect(result.lat).toBeCloseTo(dms(-37, 39, 10.1561), 7)
    expect(result.lon).toBeCloseTo(dms(143, 55, 35.3839), 7)
  })

  test('one nautical mile north along a meridian is about one minute of latitude', () => {
    const result = destination({ lat: 45, lon: 0 }, 0, 1852)
    expect((result.lat - 45) * 60).toBeCloseTo(1, 2)
    expect(result.lon).toBeCloseTo(0, 9)
  })

  test('wraps across the antimeridian', () => {
    const result = destination({ lat: 0, lon: 179.99 }, 90, 5000)
    expect(result.lon).toBeLessThan(-179.9)
  })
})
