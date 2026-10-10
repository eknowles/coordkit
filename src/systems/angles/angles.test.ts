import { describe, expect, test } from 'vitest'

import { formatDDM, formatDMS, parseLatLon } from './angles'

describe('formatting', () => {
  test('DMS and DDM', () => {
    const p = { lat: 51.5073509, lon: -0.1277583 }
    expect(formatDMS(p)).toBe('51° 30′ 26.46″ N, 000° 07′ 39.93″ W')
    expect(formatDDM(p)).toBe('51° 30.4411′ N, 000° 07.6655′ W')
  })

  test('DMS carries rounded seconds into minutes and degrees', () => {
    expect(formatDMS({ lat: 10.9999999, lon: 0 })).toBe(
      '11° 00′ 00.00″ N, 000° 00′ 00.00″ E',
    )
  })
})

describe('parseLatLon', () => {
  const near = (text: string, lat: number, lon: number, kind: string) => {
    const result = parseLatLon(text)
    expect(result?.kind).toBe(kind)
    expect(result!.point.lat).toBeCloseTo(lat, 4)
    expect(result!.point.lon).toBeCloseTo(lon, 4)
  }

  test('decimal degrees', () => {
    near('51.5074, -0.1278', 51.5074, -0.1278, 'DD')
    near('51.5074 -0.1278', 51.5074, -0.1278, 'DD')
    near('88,40', 88, 40, 'DD')
    near('-33.8688,151.2093', -33.8688, 151.2093, 'DD')
    near('51.5074N 0.1278W', 51.5074, -0.1278, 'DD')
  })

  test('DMS and DDM', () => {
    near(`51°30'26.46"N 0°07'39.93"W`, 51.5073509, -0.1277583, 'DMS')
    near('51° 30′ 26.46″ N, 000° 07′ 39.93″ W', 51.5073509, -0.1277583, 'DMS')
    near('51 30.4411 N, 0 7.6655 W', 51.5073509, -0.1277583, 'DDM')
    near('N51 30.4411 W0 7.6655', 51.5073509, -0.1277583, 'DDM')
  })

  test('rejects out-of-range and malformed input', () => {
    expect(parseLatLon('91, 0')).toBeNull()
    expect(parseLatLon('51 61 N, 0 W')).toBeNull()
    expect(parseLatLon('hello')).toBeNull()
  })
})
