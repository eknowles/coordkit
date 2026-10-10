import { Effect, Option } from 'effect'
import { afterEach, describe, expect, test } from 'vitest'

import { defaultSettings } from '../app/domain'
import { Message } from '../app/message'
import { makeFakeHost } from '../test/fakeMap'
import { MoveCamera, RenderOverlay, SetBasemap, SetProjection } from './commands'
import { removeHost, setHost } from './host'

const HOST_ID = 'test-host'
const view = { bounds: { west: -1, south: 51, east: 1, north: 52 }, zoom: 6 }

const withHost = () => {
  const fake = makeFakeHost()
  setHost(HOST_ID, fake.host)
  return fake
}

afterEach(() => {
  const { host } = makeFakeHost()
  removeHost(HOST_ID, host)
})

describe('map Commands', () => {
  test('RenderOverlay sets the deck.gl layers and the label data', async () => {
    const { overlay, sources } = withHost()
    const result = await Effect.runPromise(
      RenderOverlay({
        hostId: HOST_ID,
        view,
        gridToggles: defaultSettings.grids,
        showLabels: true,
        maybeCue: Option.some({ lat: 51.5, lon: 0 }),
        mgrsPrecision: 3,
        garsPrecision: 5,
        showRings: true,
        ringSpacing: 'Auto',
        ringUnit: 'NauticalMiles',
        basemap: 'Dark',
      }).effect,
    )
    expect(result).toEqual(Message.CompletedRenderOverlay())
    const layerIds = overlay.setProps.mock.calls[0]![0].layers.map((layer: { id: string }) => layer.id)
    expect(layerIds).toEqual(expect.arrayContaining(['Mgrs-paths', 'Gzd-paths', 'range-rings', 'cue-ring']))
    expect(sources.get('grid-labels')!.setData).toHaveBeenCalledOnce()
  })

  test('SetBasemap reloads the whole style so the label layer comes back', async () => {
    const { map } = withHost()
    await Effect.runPromise(SetBasemap({ hostId: HOST_ID, basemap: 'Light' }).effect)
    expect(map.setStyle).toHaveBeenCalledWith(expect.stringContaining('positron'), { diff: false })
  })

  test('SetProjection maps the setting to a MapLibre projection', async () => {
    const { map } = withHost()
    await Effect.runPromise(SetProjection({ hostId: HOST_ID, projection: 'Mercator' }).effect)
    expect(map.setProjection).toHaveBeenCalledWith({ type: 'mercator' })
  })

  test('MoveCamera flies to a point, or fits a cell', async () => {
    const { map } = withHost()
    const point = { lat: 51.5, lon: 0 }
    await Effect.runPromise(MoveCamera({ hostId: HOST_ID, point, maybeBounds: Option.none() }).effect)
    expect(map.flyTo).toHaveBeenCalledWith(expect.objectContaining({ center: [0, 51.5], zoom: 12 }))
    await Effect.runPromise(MoveCamera({ hostId: HOST_ID, point, maybeBounds: Option.some([0, 51, 0.5, 51.5]) }).effect)
    expect(map.fitBounds).toHaveBeenCalledOnce()
  })

  test('does nothing when the map has not mounted', async () => {
    const result = await Effect.runPromise(SetProjection({ hostId: 'missing', projection: 'Globe' }).effect)
    expect(result).toEqual(Message.CompletedSetProjection())
  })
})
