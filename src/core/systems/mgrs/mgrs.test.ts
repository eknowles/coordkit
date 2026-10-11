import * as mgrsRef from 'mgrs'
import { describe, expect, test } from 'vitest'

import { points } from '../../../test/points'
import { mgrsGrid, mgrsSquareOutline } from './grid'
import { fromMgrs, toMgrs } from './mgrs'

describe('MGRS', () => {
  test('agrees with the mgrs package', () => {
    // The mgrs package uses a lower-order series, so 1 m truncation can differ at a grid line.
    for (const p of points(3000)) {
      const ours = toMgrs(p, 5)
      const ref = mgrsRef.forward([p.lon, p.lat], 5)
      expect(ours.slice(0, -10)).toBe(ref.slice(0, -10))
      expect(
        Math.abs(Number(ours.slice(-10, -5)) - Number(ref.slice(-10, -5))),
      ).toBeLessThanOrEqual(1)
      expect(
        Math.abs(Number(ours.slice(-5)) - Number(ref.slice(-5))),
      ).toBeLessThanOrEqual(1)
    }
  })

  test('known references', () => {
    expect(toMgrs({ lat: 0, lon: 0 }, 5)).toBe('31NAA6602100000')
    expect(toMgrs({ lat: 90, lon: 0 }, 5)).toBe('ZAH0000000000')
    expect(toMgrs({ lat: -90, lon: 0 }, 5)).toBe('BAN0000000000')
  })

  test('round-trips at 1 m including polar areas', () => {
    for (const p of points(2000, -90, 90)) {
      const s = toMgrs(p, 5)
      expect(toMgrs(fromMgrs(s).center, 5)).toBe(s)
    }
  })

  test('precision truncates', () => {
    const p = { lat: 51.50735, lon: -0.12776 }
    const full = toMgrs(p, 5)
    expect(toMgrs(p, 3)).toBe(
      full.slice(0, 5) + full.slice(5, 8) + full.slice(10, 13),
    )
    expect(toMgrs(p, 0)).toBe(full.slice(0, 5))
  })
})

describe('MGRS grid', () => {
  test('draws lines in every zone of a view that crosses the equator and a zone edge', () => {
    const grid = mgrsGrid([-0.12, -0.08, 0.2, 0.16], 12.3)
    const lons = grid.paths.flatMap(p => p.path.map(([lon]) => lon))
    const lats = grid.paths.flatMap(p => p.path.map(([, lat]) => lat))
    expect(Math.min(...lons)).toBeLessThan(0)
    expect(Math.max(...lons)).toBeGreaterThan(0)
    expect(Math.min(...lats)).toBeLessThan(0)
    expect(Math.max(...lats)).toBeGreaterThan(0)
  })

  test('labels 100 km squares with their letters', () => {
    expect(mgrsGrid([-1, 51, 1, 52], 6).labels.map(l => l.text)).toContain('XC')
  })

  test('stays empty below zoom 5', () => {
    expect(mgrsGrid([-10, 40, 10, 60], 4).paths).toHaveLength(0)
  })
})

describe('MGRS grid as ticks', () => {
  const view = [-0.3, 51.4, 0.1, 51.6] as const
  const ticks = mgrsGrid(view, 12, undefined, 'Ticks')
  const lines = mgrsGrid(view, 12)
  const isOnEdge = ([lon, lat]: readonly [number, number]) =>
    [view[0], view[2]].some(edge => Math.abs(lon - edge) < 1e-6) ||
    [view[1], view[3]].some(edge => Math.abs(lat - edge) < 1e-6)

  test('keeps only short ticks from the view edge and crosses at the intersections', () => {
    const tickLength = (view[3] - view[1]) * 0.02
    ticks.paths.forEach(({ path }) => {
      const [start] = path
      const end = path[path.length - 1]!
      const length = Math.hypot(
        (end[0] - start![0]) * Math.cos((51.5 * Math.PI) / 180),
        end[1] - start![1],
      )
      expect(length).toBeLessThan(tickLength * 1.01)
    })
    expect(ticks.paths.some(({ path }) => isOnEdge(path[0]!))).toBe(true)
    expect(ticks.paths.some(({ path }) => !isOnEdge(path[0]!))).toBe(true)
  })

  test('has a tick at each end of every line that crosses the view', () => {
    const edgeTicks = ticks.paths.filter(({ path }) => isOnEdge(path[0]!))
    const crossingEnds = lines.paths.flatMap(({ path }) =>
      [path[0]!, path[path.length - 1]!].filter(isOnEdge),
    )
    expect(edgeTicks).toHaveLength(crossingEnds.length)
  })

  test('labels the south and west ticks with their kilometre digits', () => {
    const texts = ticks.labels.map(({ text }) => text)
    expect(texts.length).toBeGreaterThan(0)
    texts.forEach(text => expect(text).toMatch(/^\d{2}$/))
  })
})

describe('MGRS square outline', () => {
  test('surrounds the point at the requested precision', () => {
    const point = { lat: 51.5073509, lon: -0.1277583 }
    const outline = mgrsSquareOutline(toMgrs(point, 2))!
    const lons = outline.map(([lon]) => lon)
    const lats = outline.map(([, lat]) => lat)
    expect(Math.min(...lons)).toBeLessThan(point.lon)
    expect(Math.max(...lons)).toBeGreaterThan(point.lon)
    expect(Math.min(...lats)).toBeLessThan(point.lat)
    expect(Math.max(...lats)).toBeGreaterThan(point.lat)
    expect(outline[0]).toEqual(outline[outline.length - 1])
  })

  test('has no outline in the polar areas or for invalid input', () => {
    expect(mgrsSquareOutline('ZAH0000000000')).toBeNull()
    expect(mgrsSquareOutline('not mgrs')).toBeNull()
  })
})

describe('MGRS edge cases', () => {
  test('the poles have valid square letters', () => {
    expect(toMgrs({ lat: 90, lon: -20 }, 0)).toBe('ZAH')
    expect(toMgrs({ lat: -90, lon: 10 }, 0)).toMatch(/^B[A-Z]{2}$/)
  })

  test('a position just below a 100 km line never gets digits from the next square', () => {
    const reference = toMgrs({ lat: 89.9999999999991, lon: 0 }, 3)
    expect(reference).toMatch(/^Z[A-Z]{2}\d{6}$/)
    expect(toMgrs({ lat: -8.41434211054512e-15, lon: 0 }, 3)).toMatch(
      /^31[A-Z]{3}\d{6}$/,
    )
  })

  test('reads a square that straddles its latitude band edge', () => {
    expect(fromMgrs('31XCV').center.lat).toBeCloseTo(
      mgrsRef.toPoint('31XCV')[1],
      0,
    )
  })
})
