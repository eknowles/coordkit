import { describe, expect, test } from 'vitest'

import { makeFakeMap } from '../test/fakeMap'
import { ensureLabelLayer, setLabels } from './labels'

const labels: GeoJSON.FeatureCollection = {
  type: 'FeatureCollection',
  features: [],
}

describe('grid labels', () => {
  test('adds the label source and layer once, then updates the data', () => {
    const { fake, map, sources } = makeFakeMap()
    setLabels(map, labels)
    setLabels(map, labels)
    expect(fake.addSource).toHaveBeenCalledOnce()
    expect(fake.addLayer).toHaveBeenCalledOnce()
    expect(sources.get('grid-labels')!.setData).toHaveBeenCalledTimes(2)
  })

  test('waits while the style is still loading', () => {
    const { fake, map } = makeFakeMap()
    fake.addSource.mockImplementation(() => {
      throw new Error('Style is not done loading')
    })
    expect(ensureLabelLayer(map)).toBe(false)
    expect(() => setLabels(map, labels)).not.toThrow()
    expect(fake.addLayer).not.toHaveBeenCalled()
  })
})
