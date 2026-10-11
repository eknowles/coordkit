import { describe, expect, test } from 'vitest'

import { fromGeoref, isGeoref, toGeoref } from './georef'
import { georefGrid } from './grid'

describe('GEOREF', () => {
  test('encodes the 15° quadrangle, the 1° square and whole minutes', () => {
    expect(toGeoref({ lat: 51.5073509, lon: -0.1277583 })).toBe('MKQG5230')
    expect(toGeoref({ lat: 51.5073509, lon: -0.1277583 }, false)).toBe('MKQG')
  })

  test('starts at 180°W, 90°S and skips I and O', () => {
    expect(toGeoref({ lat: -90, lon: -180 })).toBe('AAAA0000')
    expect(toGeoref({ lat: 0, lon: 0 })).toBe('NGAA0000')
    expect(toGeoref({ lat: 90, lon: 180 })).toBe('ZMQQ5959')
  })

  test('decodes to the cell it names', () => {
    const cell = fromGeoref('MKQG5230')
    expect(cell.west).toBeCloseTo(-0.1333333, 6)
    expect(cell.south).toBeCloseTo(51.5, 6)
    expect(cell.east - cell.west).toBeCloseTo(1 / 60, 9)
    expect(fromGeoref('MKQG')).toEqual({
      west: -1,
      south: 51,
      east: 0,
      north: 52,
    })
    expect(
      fromGeoref('MKQG523305').east - fromGeoref('MKQG523305').west,
    ).toBeCloseTo(1 / 600, 9)
  })

  test('every point decodes back inside its own cell', () => {
    for (let lat = -89.5; lat < 90; lat += 7.3) {
      for (let lon = -179.5; lon < 180; lon += 11.7) {
        const cell = fromGeoref(toGeoref({ lat, lon }))
        // NOTE: the stepped test points carry float error of about 1e-14.
        expect(lat).toBeGreaterThanOrEqual(cell.south - 1e-9)
        expect(lat).toBeLessThan(cell.north)
        expect(lon).toBeGreaterThanOrEqual(cell.west - 1e-9)
        expect(lon).toBeLessThan(cell.east)
      }
    }
  })

  test('rejects letters it does not use and minutes past 59', () => {
    expect(isGeoref('MKQG5230')).toBe(true)
    expect(isGeoref('mk qg 52 30')).toBe(true)
    expect(isGeoref('MIQG')).toBe(false)
    expect(isGeoref('MKQO')).toBe(false)
    expect(isGeoref('MKQG523')).toBe(false)
    expect(() => fromGeoref('MKQG6030')).toThrow()
  })

  test('draws quadrangles when zoomed out and 1° squares when zoomed in', () => {
    const world = georefGrid([-180, -90, 180, 90], 1)
    expect(world.labels.map(label => label.text)).toContain('MK')
    const london = georefGrid([-2, 51, 1, 53], 6)
    expect(london.labels.map(label => label.text)).toContain('MKQG')
  })
})
