import { describe, expect, test, vi } from 'vitest'

import { makeFakeHost } from '../test/fakeMap'
import { ensureLabelLayer, setLabels } from './labels'

const labels: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] }

describe('grid labels', () => {
  test('adds the label source and layer once, then updates the data', () => {
    const { host, map, sources } = makeFakeHost()
    setLabels(host.map, labels)
    setLabels(host.map, labels)
    expect(map.addSource).toHaveBeenCalledOnce()
    expect(map.addLayer).toHaveBeenCalledOnce()
    expect(sources.get('grid-labels')!.setData).toHaveBeenCalledTimes(2)
  })

  test('waits while the style is still loading', () => {
    const { host, map } = makeFakeHost()
    map.addSource.mockImplementation(() => {
      throw new Error('Style is not done loading')
    })
    expect(ensureLabelLayer(host.map)).toBe(false)
    expect(() => setLabels(host.map, labels)).not.toThrow()
    expect(vi.mocked(map.addLayer)).not.toHaveBeenCalled()
  })
})
