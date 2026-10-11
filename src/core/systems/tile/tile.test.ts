import { describe, expect, test } from 'vitest'

import { gridTileZoom, tileGrid } from './grid'
import {
  fromQuadkey,
  fromTilePath,
  tileCell,
  tilePath,
  toQuadkey,
  toTile,
} from './tile'

const london = { lat: 51.5073509, lon: -0.1277583 }

describe('web map tiles', () => {
  test('find the tile under a point', () => {
    expect(toTile(london, 0)).toEqual({ z: 0, x: 0, y: 0 })
    expect(tilePath(toTile(london, 12))).toBe('12/2046/1362')
    expect(tilePath(toTile({ lat: -33.8568, lon: 151.2153 }, 10))).toBe(
      '10/942/614',
    )
  })

  test('clamp points beyond the Web Mercator edge to the edge rows', () => {
    expect(toTile({ lat: 89, lon: 179.99 }, 3)).toEqual({ z: 3, x: 7, y: 0 })
    expect(toTile({ lat: -89, lon: -180 }, 3)).toEqual({ z: 3, x: 0, y: 7 })
  })

  test('a longitude a hair below 180 stays in the easternmost column', () => {
    expect(toTile({ lat: 0, lon: 179.99999999999994 }, 1)).toEqual({
      z: 1,
      x: 1,
      y: 1,
    })
  })

  test('the tile cell contains the point', () => {
    const cell = tileCell(toTile(london, 15))
    expect(london.lat).toBeGreaterThan(cell.south)
    expect(london.lat).toBeLessThan(cell.north)
    expect(london.lon).toBeGreaterThan(cell.west)
    expect(london.lon).toBeLessThan(cell.east)
  })

  test('write quadkeys as Bing Maps does', () => {
    expect(toQuadkey({ z: 3, x: 3, y: 5 })).toBe('213')
    expect(fromQuadkey('213')).toEqual({ z: 3, x: 3, y: 5 })
    expect(fromQuadkey(toQuadkey(toTile(london, 18)))).toEqual(
      toTile(london, 18),
    )
  })

  test('read z/x/y only for tiles that exist', () => {
    expect(fromTilePath('12/2046/1362')).toEqual({ z: 12, x: 2046, y: 1362 })
    expect(() => fromTilePath('3/8/0')).toThrow()
    expect(() => fromTilePath('25/0/0')).toThrow()
    expect(() => fromQuadkey('0124')).toThrow()
  })

  test('the grid draws tiles one level deeper than the map zoom', () => {
    expect(gridTileZoom(9.6)).toBe(10)
    const grid = tileGrid([-0.4, 51.3, 0.2, 51.7], 9.6)
    expect(grid.labels.map(label => label.text)).toContain('10/511/340')
    expect(tileGrid([-10, 86, 10, 89], 3).paths).toEqual([])
  })
})
