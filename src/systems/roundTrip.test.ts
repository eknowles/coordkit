import { Option } from 'effect'
import fc from 'fast-check'
import { describe, expect, test } from 'vitest'

import type { LatLon } from '../geo/ellipsoid'
import { formatters, parseCoordinate } from './registry'
import { MAX_TILE_LATITUDE } from './tile/tile'
import type { Formatter, SystemOptions } from './types'

/** Cases per system. Set ROUND_TRIP_RUNS to search harder, for example before a release. */
const RUNS = Number(process.env['ROUND_TRIP_RUNS'] ?? 1000)
const EARTH_RADIUS_METRES = 6_371_008.8
const CELL_EDGE_TOLERANCE = 1e-9

/** Cell sizes in degrees that some system has an edge at, so the edge cases get tested. */
const CELL_STEPS = [20, 15, 6, 1, 0.5, 0.25, 1 / 12, 1 / 60, 0.05, 0.0025]

/** Latitudes where UTM, UPS and MGRS change zone, band or projection. */
const ZONE_LATITUDES = [-90, -80, -79.5, 0, 56, 64, 72, 84, 84.5, 90]

const randomPoint = fc.record({
  lat: fc.double({ min: -90, max: 90, noNaN: true }),
  lon: fc.double({ min: -180, max: 180, maxExcluded: true, noNaN: true }),
})

/** A point on, or a hair either side of, a cell edge. */
const edgePoint = fc
  .record({
    step: fc.constantFrom(...CELL_STEPS),
    latIndex: fc.integer({ min: -1800, max: 1800 }),
    lonIndex: fc.integer({ min: -3600, max: 3600 }),
    nudge: fc.constantFrom(0, 1e-12, -1e-12, 1e-9, -1e-9),
  })
  .map(({ step, latIndex, lonIndex, nudge }) => ({
    lat: Math.max(-90, Math.min(90, latIndex * step + nudge)),
    lon: Math.max(-180, Math.min(179.999999999, lonIndex * step + nudge)),
  }))

const zonePoint = fc.record({
  lat: fc.constantFrom(...ZONE_LATITUDES),
  lon: fc.oneof(
    fc.constantFrom(-180, -0.000001, 0, 3, 6, 9, 21, 33, 42, 179.999999),
    fc.double({ min: -180, max: 180, maxExcluded: true, noNaN: true }),
  ),
})

const point = fc.oneof(randomPoint, edgePoint, zonePoint)

const options: fc.Arbitrary<SystemOptions> = fc.record({
  mgrsPrecision: fc.constantFrom(0, 1, 2, 3, 4, 5),
  garsPrecision: fc.constantFrom(5, 15, 30),
  tileZoom: fc.constantFrom(1, 5, 12, 18, 22),
})

const distanceMetres = (from: LatLon, to: LatLon): number => {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180
  const deltaLat = toRadians(to.lat - from.lat)
  const deltaLon = toRadians(to.lon - from.lon)
  const haversine =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(toRadians(from.lat)) *
      Math.cos(toRadians(to.lat)) *
      Math.sin(deltaLon / 2) ** 2
  return 2 * EARTH_RADIUS_METRES * Math.asin(Math.min(1, Math.sqrt(haversine)))
}

type Expectation = Readonly<{
  kinds: ReadonlyArray<string>
  /** Whether formatting the parsed point must give back the same text. */
  isTextStable: boolean
  /** How far the parsed point may be from the original, for references that name a point. */
  toleranceMetres: (options: SystemOptions) => number
  /** The point a cell should contain; tiles stop at the Web Mercator edge. */
  containedPoint: (point: LatLon) => LatLon
}>

const asIs = (point: LatLon): LatLon => point

const pointSystem = (
  kinds: ReadonlyArray<string>,
  toleranceMetres: Expectation['toleranceMetres'],
  isTextStable = true,
): Expectation => ({
  kinds,
  isTextStable,
  toleranceMetres,
  containedPoint: asIs,
})

const cellSystem = (
  kind: string,
  containedPoint: Expectation['containedPoint'] = asIs,
): Expectation => ({
  kinds: [kind],
  isTextStable: true,
  toleranceMetres: () => Number.POSITIVE_INFINITY,
  containedPoint,
})

/** MGRS truncates, so the reference names the south-west corner of a square. */
const mgrsTolerance = ({ mgrsPrecision }: SystemOptions) =>
  10 ** (5 - mgrsPrecision) * Math.SQRT2 + 1

const expectations: Readonly<Record<string, Expectation>> = {
  DD: pointSystem(['DD'], () => 0.2),
  DMS: pointSystem(['DMS'], () => 0.5),
  DDM: pointSystem(['DDM'], () => 0.3),
  // NOTE: UTM and MGRS truncate to the south-west corner of a square. On a zone edge that
  // corner can sit just inside the next zone, so the same position is written another way.
  UTM: pointSystem(['UTM', 'UPS'], () => 1.5, false),
  MGRS: pointSystem(['MGRS'], mgrsTolerance, false),
  GARS: cellSystem('GARS'),
  GEOREF: cellSystem('GEOREF'),
  PlusCode: cellSystem('Plus Code'),
  Geohash: cellSystem('Geohash'),
  Maidenhead: cellSystem('Maidenhead'),
  Tile: cellSystem('Map tile', ({ lat, lon }) => ({
    lat: Math.max(-MAX_TILE_LATITUDE, Math.min(MAX_TILE_LATITUDE, lat)),
    lon,
  })),
}

/** Formatters with no parser: their readings cannot be typed into the search. */
const READOUT_ONLY = ['WebMercator', 'ECEF']

const isInside = (
  { lat, lon }: LatLon,
  [west, south, east, north]: readonly [number, number, number, number],
) =>
  lat >= south - CELL_EDGE_TOLERANCE &&
  lat <= north + CELL_EDGE_TOLERANCE &&
  lon >= west - CELL_EDGE_TOLERANCE &&
  lon <= east + CELL_EDGE_TOLERANCE

const checkRoundTrip =
  (formatter: Formatter, expectation: Expectation) =>
  (original: LatLon, systemOptions: SystemOptions) => {
    const reading = formatter.format(original, systemOptions)
    const maybeResult = parseCoordinate(reading.copyText)
    expect(
      Option.isSome(maybeResult),
      `search did not read "${reading.copyText}"`,
    ).toBe(true)
    const result = Option.getOrThrow(maybeResult)

    expect(expectation.kinds).toContain(result.kind)
    if (expectation.isTextStable) {
      expect(formatter.format(result.point, systemOptions).copyText).toBe(
        reading.copyText,
      )
    }
    Option.match(result.maybeBounds, {
      onNone: () =>
        expect(distanceMetres(original, result.point)).toBeLessThanOrEqual(
          expectation.toleranceMetres(systemOptions),
        ),
      onSome: bounds =>
        expect(
          isInside(expectation.containedPoint(original), bounds),
          `${reading.copyText} does not contain the point`,
        ).toBe(true),
    })
  }

describe('every reading reads back through the search', () => {
  test('every formatter has an expectation or is readout-only', () => {
    for (const formatter of formatters) {
      expect(
        formatter.id in expectations || READOUT_ONLY.includes(formatter.id),
        formatter.id,
      ).toBe(true)
    }
  })

  test.each(formatters.filter(formatter => formatter.id in expectations))(
    '$label',
    formatter => {
      const expectation = expectations[formatter.id]!
      fc.assert(
        fc.property(point, options, checkRoundTrip(formatter, expectation)),
        {
          numRuns: RUNS,
        },
      )
    },
  )
})
