import proj4 from 'proj4'
import { describe, expect, test } from 'vitest'

import { points } from '../../test/points'
import { GZD_CELLS, gzdGrid } from './gzd'
import { fromUps, fromUtm, toUps, toUtm, utmZone } from './utm'

describe('UTM', () => {
  test('matches proj4 to the millimetre', () => {
    for (const p of points(2000)) {
      const u = toUtm(p)
      const def = `+proj=utm +zone=${u.zone} ${u.hemisphere === 'S' ? '+south' : ''} +datum=WGS84 +units=m`
      const [e, n] = proj4('EPSG:4326', def, [p.lon, p.lat])
      expect(Math.abs(u.easting - e!)).toBeLessThan(0.001)
      expect(Math.abs(u.northing - n!)).toBeLessThan(0.001)
    }
  })

  test('round-trips', () => {
    for (const p of points(2000)) {
      const u = toUtm(p)
      const q = fromUtm(u.zone, u.hemisphere, u.easting, u.northing)
      expect(q.lat).toBeCloseTo(p.lat, 9)
      expect(q.lon).toBeCloseTo(p.lon, 9)
    }
  })

  test('zone exceptions for Norway and Svalbard', () => {
    expect(utmZone(60, 4)).toBe(32)
    expect(utmZone(60, 2)).toBe(31)
    expect(utmZone(78, 8)).toBe(31)
    expect(utmZone(78, 10)).toBe(33)
    expect(utmZone(78, 22)).toBe(35)
    expect(utmZone(78, 40)).toBe(37)
    expect(utmZone(0, 180)).toBe(60)
    expect(utmZone(0, -180)).toBe(1)
  })
})

describe('UPS', () => {
  test('matches proj4 and round-trips', () => {
    for (const p of [...points(300, 84, 90), ...points(300, -90, -80)]) {
      const u = toUps(p)
      const def = `+proj=stere +lat_0=${u.hemisphere === 'S' ? -90 : 90} +lon_0=0 +k=0.994 +x_0=2000000 +y_0=2000000 +datum=WGS84 +units=m`
      const [e, n] = proj4('EPSG:4326', def, [p.lon, p.lat])
      expect(Math.abs(u.easting - e!)).toBeLessThan(0.001)
      expect(Math.abs(u.northing - n!)).toBeLessThan(0.001)
      const q = fromUps(u.hemisphere, u.easting, u.northing)
      expect(q.lat).toBeCloseTo(p.lat, 9)
      expect(q.lon).toBeCloseTo(p.lon, 9)
    }
  })
})

describe('GZD grid', () => {
  test('cells include the Norway and Svalbard exceptions and the UPS caps', () => {
    const find = (zone: number | null, band: string) => GZD_CELLS.find(c => c.zone === zone && c.band === band)
    expect(find(32, 'V')).toMatchObject({ west: 3, east: 12 })
    expect(find(31, 'V')).toMatchObject({ west: 0, east: 3 })
    expect(find(33, 'X')).toMatchObject({ west: 9, east: 21 })
    expect(find(32, 'X')).toBeUndefined()
    expect(find(null, 'Z')).toMatchObject({ south: 84, north: 90 })
  })

  test('labels each visible zone', () => {
    const texts = gzdGrid([-10, 40, 10, 60], 4).labels.map(l => l.text)
    expect(texts).toContain('30U')
    expect(texts).toContain('31U')
  })
})
