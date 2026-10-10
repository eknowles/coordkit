import { describe, expect, test } from 'vitest'

import { destination } from '../geo/geodesic'
import { RING_COUNT, autoStep, buildRings, ringLabelText, ringStep } from './rings'

const viewOf = (south: number, north: number) => ({ bounds: { west: -1, south, east: 1, north }, zoom: 8 })

describe('ringStep', () => {
  test('a fixed spacing is used as given and Auto follows the view', () => {
    expect(ringStep('2', viewOf(50, 52), 'NauticalMiles')).toBe(2)
    expect(ringStep('Auto', viewOf(50, 52), 'NauticalMiles')).toBe(5)
  })

  test('Auto picks the largest 1-2-5 step that keeps every ring in view', () => {
    // A 2° tall view is about 120 NM; half is 60 NM; 85% over 6 rings is 8.5 NM, so 5 NM.
    expect(autoStep(viewOf(50, 52), 'NauticalMiles')).toBe(5)
    expect(autoStep(viewOf(50, 52), 'Kilometres')).toBe(10)
    expect(autoStep(viewOf(51, 51.01), 'NauticalMiles')).toBe(0.1)
  })
})

describe('buildRings', () => {
  const cue = { lat: 51.5, lon: -0.12 }

  test('draws evenly spaced geodesic rings labelled at their north point', () => {
    const rings = buildRings(cue, 1, 'NauticalMiles')
    expect(rings).toHaveLength(RING_COUNT)
    expect(rings.map(ring => ring.label.text)).toEqual(['1 NM', '2 NM', '3 NM', '4 NM', '5 NM', '6 NM'])
    const third = rings[2]!
    expect(third.label.position[1]).toBeCloseTo(destination(cue, 0, 3 * 1852).lat, 9)
  })

  test('each ring is closed and every vertex sits at the ring radius', () => {
    const [first] = buildRings(cue, 1, 'Kilometres')
    const path = first!.path
    expect(path[0]![0]).toBeCloseTo(path[path.length - 1]![0], 9)
    expect(path[0]![1]).toBeCloseTo(path[path.length - 1]![1], 9)
    const east = destination(cue, 90, 1000)
    expect(path[45]![0]).toBeCloseTo(east.lon, 9)
    expect(path[45]![1]).toBeCloseTo(east.lat, 9)
  })

  test('a ring that crosses the antimeridian keeps continuous longitudes', () => {
    const [first] = buildRings({ lat: 0, lon: 179.99 }, 5, 'Kilometres')
    const lons = first!.path.map(([lon]) => lon)
    expect(Math.max(...lons) - Math.min(...lons)).toBeLessThan(1)
  })

  test('labels keep fractional spacings readable', () => {
    expect(ringLabelText(3, 0.25, 'NauticalMiles')).toBe('0.75 NM')
    expect(ringLabelText(2, 0.1, 'Kilometres')).toBe('0.2 km')
  })
})
