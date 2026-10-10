import { describe, expect, test } from 'vitest'

import { points } from '../../test/points'
import { fromGars, toGars } from './gars'
import { garsGrid } from './grid'

describe('GARS', () => {
  test('cells', () => {
    expect(toGars({ lat: -90, lon: -180 })).toBe('001AA37')
    expect(toGars({ lat: 0.01, lon: 0.01 })).toBe('361HN37')
    expect(toGars({ lat: 89.99, lon: 179.99 })).toBe('720QZ23')
    expect(toGars({ lat: 0.01, lon: 0.01 }, 30)).toBe('361HN')
    expect(toGars({ lat: 0.49, lon: 0.01 }, 15)).toBe('361HN1')
  })

  test('round-trips', () => {
    for (const p of points(2000, -90, 90)) {
      const c = fromGars(toGars(p))
      expect(p.lon).toBeGreaterThanOrEqual(c.west - 1e-9)
      expect(p.lon).toBeLessThanOrEqual(c.east + 1e-9)
      expect(p.lat).toBeGreaterThanOrEqual(c.south - 1e-9)
      expect(p.lat).toBeLessThanOrEqual(c.north + 1e-9)
    }
  })
})

describe('GARS grid', () => {
  test('labels cells at the zoom-appropriate precision', () => {
    expect(garsGrid([0, 0, 1, 1], 6).labels.map(l => l.text)).toContain('361HN')
    expect(garsGrid([0, 0, 0.5, 0.5], 8).labels.map(l => l.text)).toContain(
      '361HN3',
    )
  })
})
