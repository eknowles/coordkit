import { Option } from 'effect'
import { describe, expect, test } from 'vitest'

import { toGars } from './gars/gars'
import { toMgrs } from './mgrs/mgrs'
import { formatters, grids, parseCoordinate, parsers } from './registry'
import { tilePath, toQuadkey, toTile } from './tile/tile'
import type { SystemOptions } from './types'
import { toUtm } from './utm/utm'

const london = { lat: 51.5073509, lon: -0.1277583 }
const options: SystemOptions = {
  mgrsPrecision: 5,
  garsPrecision: 5,
  tileZoom: 12,
}

describe('registry', () => {
  test('ids are unique', () => {
    expect(new Set(formatters.map(f => f.id)).size).toBe(formatters.length)
    expect(new Set(grids.map(g => g.id)).size).toBe(grids.length)
  })

  test('every formatter gives two non-empty lines and copy text', () => {
    for (const formatter of formatters) {
      const reading = formatter.format(london, options)
      expect(reading.lines[0]).not.toBe('')
      expect(reading.lines[1]).not.toBe('')
      expect(reading.copyText).not.toBe('')
    }
  })

  test('every formatter handles the poles', () => {
    for (const formatter of formatters) {
      expect(() =>
        formatter.format({ lat: 89.9, lon: 10 }, options),
      ).not.toThrow()
      expect(() =>
        formatter.format({ lat: -89.9, lon: 10 }, options),
      ).not.toThrow()
    }
  })

  test('only GARS results carry a caution, as GARS names an area', () => {
    const cautionOf = (text: string) =>
      Option.flatMap(parseCoordinate(text), result => result.maybeCaution)
    expect(cautionOf('361HN37')).toEqual(Option.some('an area, not a position'))
    expect(cautionOf('51.5, -0.12')).toEqual(Option.none())
    expect(cautionOf('30U XC 99319 10158')).toEqual(Option.none())
  })

  test('every parser rejects empty text', () => {
    for (const parser of parsers) {
      expect(parser.parse('')).toEqual(Option.none())
    }
  })
})

describe('parseCoordinate', () => {
  const near = (text: string, kind: string, tolerance: number) => {
    const result = Option.getOrThrow(parseCoordinate(text))
    expect(result.kind).toBe(kind)
    expect(Math.abs(result.point.lat - london.lat)).toBeLessThan(tolerance)
    expect(Math.abs(result.point.lon - london.lon)).toBeLessThan(tolerance)
  }

  test('routes each format to its parser', () => {
    const utm = toUtm(london)
    near(
      `${utm.zone}${utm.band} ${utm.easting.toFixed(2)} ${utm.northing.toFixed(2)}`,
      'UTM',
      1e-7,
    )
    near(toMgrs(london, 5), 'MGRS', 1e-4)
    near(toMgrs(london, 5, true), 'MGRS', 1e-4)
    near(toGars(london), 'GARS', 0.05)
    near('IO91wm', 'Maidenhead', 0.05)
    near('gcpvj0duq', 'Geohash', 0.001)
    near('51.5073509, -0.1277583', 'DD', 1e-6)
    near(`51°30'26.46"N 0°07'39.93"W`, 'DMS', 1e-4)
    near('MKQG5230', 'GEOREF', 0.02)
    near('9C3XGV4C+WV', 'Plus Code', 1e-3)
    near(tilePath(toTile(london, 17)), 'Map tile', 0.01)
    near(`qk:${toQuadkey(toTile(london, 17))}`, 'Map tile', 0.01)
  })

  test('reads UPS', () => {
    expect(
      Option.getOrThrow(parseCoordinate('UPS N 2000000 2000000')).point.lat,
    ).toBeCloseTo(90, 6)
  })

  test('returns none for unrecognised text', () => {
    expect(parseCoordinate('not a place')).toEqual(Option.none())
  })
})
