import { describe, expect, test } from 'vitest'

import { makeFakeMap } from '../test/fakeMap'
import { ensureOverlayLayers, setOverlay } from './layers'
import type { OverlayFrame } from './overlay'

const frame: OverlayFrame = {
  lines: { type: 'FeatureCollection', features: [] },
  cueMarker: { type: 'FeatureCollection', features: [] },
  labels: { type: 'FeatureCollection', features: [] },
}

describe('overlay layers', () => {
  test('adds the sources and layers once, then updates the data', () => {
    const { fake, map, sources } = makeFakeMap()
    setOverlay(map, frame)
    setOverlay(map, frame)
    expect(fake.addSource).toHaveBeenCalledTimes(3)
    expect(fake.addLayer.mock.calls.map(([layer]) => layer.id)).toEqual([
      'overlay-lines',
      'overlay-cue-ring',
      'overlay-cue-centre',
      'grid-labels',
    ])
    for (const id of ['overlay-lines', 'overlay-cue', 'grid-labels']) {
      expect(sources.get(id)!.setData).toHaveBeenCalledTimes(2)
    }
  })

  test('waits while the style is still loading', () => {
    const { fake, map } = makeFakeMap()
    fake.addSource.mockImplementation(() => {
      throw new Error('Style is not done loading')
    })
    expect(ensureOverlayLayers(map)).toBe(false)
    expect(() => setOverlay(map, frame)).not.toThrow()
    expect(fake.addLayer).not.toHaveBeenCalled()
  })
})
