import { OpenLocationCode } from 'open-location-code'
import { describe, expect, test } from 'vitest'

import { plusCodeGrid, plusCodePairs } from './grid'
import { fromPlusCode, isFullPlusCode, toPlusCode } from './plusCode'

const reference = new OpenLocationCode()

const samplePoints = [
  { lat: 51.5073509, lon: -0.1277583 },
  { lat: -33.8568, lon: 151.2153 },
  { lat: 40.689247, lon: -74.044502 },
  { lat: 0, lon: 0 },
  { lat: -89.9999, lon: -179.9999 },
  { lat: 89.9999, lon: 179.9999 },
  { lat: 90, lon: 180 },
  { lat: 47.0000625, lon: 8.0000625 },
]

describe('Plus Codes', () => {
  test('match the reference implementation at 10 and 11 digits', () => {
    for (const { lat, lon } of samplePoints) {
      expect(toPlusCode({ lat, lon })).toBe(reference.encode(lat, lon, 10))
      expect(toPlusCode({ lat, lon }, 11)).toBe(reference.encode(lat, lon, 11))
    }
  })

  test('decode to the same area as the reference implementation', () => {
    for (const code of [
      '9C3XGV4C+WV',
      '9C3XGV4C+WVX',
      '9C3XGV00+',
      '9C000000+',
    ]) {
      const cell = fromPlusCode(code)
      const area = reference.decode(code)
      expect(cell.south).toBeCloseTo(area.latitudeLo, 9)
      expect(cell.west).toBeCloseTo(area.longitudeLo, 9)
      expect(cell.north).toBeCloseTo(area.latitudeHi, 9)
      expect(cell.east).toBeCloseTo(area.longitudeHi, 9)
    }
  })

  test('accept only full codes, the same as the reference implementation', () => {
    for (const code of [
      '9C3XGV4C+WV',
      '9C3XGV00+',
      '9C3X0000+',
      '9C3XGV4C+X',
      'GV4C+WV',
      '9C3XGV00+WV',
      'X23XGV4C+WV',
    ]) {
      expect(isFullPlusCode(code)).toBe(reference.isFull(code))
    }
  })

  test('the grid refines with zoom and labels its cells', () => {
    expect(plusCodePairs(1)).toBe(1)
    expect(plusCodePairs(14)).toBe(3)
    expect(plusCodePairs(19)).toBe(5)
    const london = plusCodeGrid([-0.2, 51.45, -0.05, 51.55], 11.5)
    expect(london.labels.map(label => label.text)).toContain('9C3XGV')
    const street = plusCodeGrid([-0.129, 51.5068, -0.1265, 51.508], 15.5)
    expect(street.labels.map(label => label.text)).toContain('9C3XGV4C+')
  })
})
