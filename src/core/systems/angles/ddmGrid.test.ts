import { describe, expect, test } from 'vitest'

import { inBox } from '../../geo/geometry'
import {
  buildDdmGrid,
  ddmCellOutline,
  ddmStep,
  ddmTickStep,
  formatDdmLabel,
} from './ddmGrid'

const MINUTE = 100
const DEGREE = 60 * MINUTE

const labelsOf = (view: Parameters<typeof buildDdmGrid>[0]) =>
  buildDdmGrid(view).labels.map(label => label.text)

describe('ddmStep', () => {
  test('picks whole degrees for a wide view', () => {
    expect(ddmStep([-10, 40, 10, 60])).toBe(DEGREE)
  })

  test('picks whole minutes for a harbour-sized view', () => {
    expect(ddmStep([-1.5, 50.5, -1, 50.8])).toBe(2 * MINUTE)
  })

  test('picks tenths and hundredths of a minute when zoomed in close', () => {
    expect(ddmStep([0, 0, 0.04, 0.04])).toBe(MINUTE / 10)
    expect(ddmStep([0, 0, 0.002, 0.002])).toBe(1)
  })
})

describe('ddmTickStep', () => {
  test('divides each line step into at least four ticks', () => {
    expect(ddmTickStep(DEGREE)).toBe(10 * MINUTE)
    expect(ddmTickStep(30 * MINUTE)).toBe(5 * MINUTE)
    expect(ddmTickStep(MINUTE)).toBe(MINUTE / 5)
  })

  test('draws no ticks when no finer step divides the line step', () => {
    expect(ddmTickStep(2)).toBe(0)
    expect(ddmTickStep(1)).toBe(0)
  })
})

describe('formatDdmLabel', () => {
  test('writes whole degrees without minutes', () => {
    expect(formatDdmLabel(50 * DEGREE, 'lat', DEGREE)).toBe('50° N')
    expect(formatDdmLabel(-5 * DEGREE, 'lon', DEGREE)).toBe('005° W')
  })

  test('writes minutes with as many decimals as the step needs', () => {
    expect(formatDdmLabel(50 * DEGREE + 30 * MINUTE, 'lat', 30 * MINUTE)).toBe(
      '50° 30′ N',
    )
    expect(formatDdmLabel(-(DEGREE + 15.5 * MINUTE), 'lon', MINUTE / 2)).toBe(
      '001° 15.5′ W',
    )
    expect(formatDdmLabel(-(12.34 * MINUTE), 'lat', 2)).toBe('00° 12.34′ S')
  })

  test('gives the equator and the prime meridian no southern or western letter', () => {
    expect(formatDdmLabel(0, 'lat', DEGREE)).toBe('00° N')
    expect(formatDdmLabel(0, 'lon', MINUTE)).toBe('000° 00′ E')
  })

  test('writes the antimeridian without a letter', () => {
    expect(formatDdmLabel(-180 * DEGREE, 'lon', DEGREE)).toBe('180°')
    expect(formatDdmLabel(180 * DEGREE, 'lon', MINUTE)).toBe('180° 00′')
  })
})

describe('buildDdmGrid', () => {
  test('draws lines at whole minutes, labelled as on a chart', () => {
    const labels = labelsOf([-1.5, 50.5, -1, 50.8])
    expect(labels).toContain('50° 40′ N')
    expect(labels).toContain('001° 20′ W')
    expect(labels).not.toContain('50° 41′ N')
  })

  test('adds minute ticks on the edges, between the grid lines', () => {
    const view = [-1.5, 50.5, -1, 50.8] as const
    const { paths } = buildDdmGrid(view)
    const ticks = paths.filter(({ path }) => path.length === 2)
    expect(ticks.length).toBeGreaterThan(0)
    ticks.forEach(({ path: [from] }) => {
      const isOnEdge =
        from![0] === view[0] ||
        from![0] === view[2] ||
        from![1] === view[1] ||
        from![1] === view[3]
      expect(isOnEdge).toBe(true)
    })
  })

  test('labels meridians past the antimeridian as western longitudes', () => {
    const labels = labelsOf([170, 0, 190, 10])
    expect(labels).toContain('170° E')
    expect(labels).toContain('170° W')
    expect(labels).toContain('180°')
  })

  test('keeps parallels inside the poles', () => {
    const { paths } = buildDdmGrid([-180, -100, 180, 100])
    paths.forEach(({ path }) =>
      path.forEach(([, lat]) => expect(Math.abs(lat)).toBeLessThanOrEqual(90)),
    )
  })
})

describe('ddmCellOutline', () => {
  test('outlines the one-minute cell that contains the point', () => {
    const point = { lat: 50.71234, lon: -1.23456 }
    const outline = ddmCellOutline(point)
    const lons = outline.map(([lon]) => lon)
    const lats = outline.map(([, lat]) => lat)
    const box = [
      Math.min(...lons),
      Math.min(...lats),
      Math.max(...lons),
      Math.max(...lats),
    ] as const
    expect(inBox(point, box)).toBe(true)
    expect((box[2] - box[0]) * 60).toBeCloseTo(1)
    expect((box[3] - box[1]) * 60).toBeCloseTo(1)
    expect(box[1] * 60).toBeCloseTo(Math.floor(point.lat * 60))
  })

  test('keeps the cell on the map at the north pole and the antimeridian', () => {
    const outline = ddmCellOutline({ lat: 90, lon: 180 })
    outline.forEach(([lon, lat]) => {
      expect(lat).toBeLessThanOrEqual(90)
      expect(lon).toBeLessThanOrEqual(180)
    })
  })
})
