import { describe, expect, test } from 'vitest'

import { graticule } from './graticule'

describe('graticule', () => {
  test('picks a round spacing that gives about two dozen lines across the view', () => {
    const grid = graticule([-10, 40, 10, 60])
    const labels = grid.labels.map(label => label.text)
    expect(labels).toContain('0°')
    expect(labels).toContain('50°')
    expect(grid.paths.length).toBeGreaterThan(4)
    expect(grid.paths.length).toBeLessThanOrEqual(50)
  })

  test('labels fine spacings with decimals', () => {
    const labels = graticule([0, 0, 0.2, 0.2]).labels.map(label => label.text)
    expect(labels).toContain('0.10°')
  })
})
