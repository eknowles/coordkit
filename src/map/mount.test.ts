import { Deferred, Effect, Stream } from 'effect'
import { beforeEach, describe, expect, test, vi } from 'vitest'

import type { Message } from '../app/message'
import { getHost } from './host'
import { MountMap } from './mount'

const maplibre = vi.hoisted(() => {
  const handlers = new Map<string, (event?: unknown) => void>()
  return {
    handlers,
    created: vi.fn(),
    removed: vi.fn(),
    emit: (name: string, event?: unknown) => handlers.get(name)?.(event),
  }
})

vi.mock('maplibre-gl', () => {
  class FakeMap {
    constructor(options: unknown) {
      maplibre.created(options)
    }
    on(name: string, handler: (event?: unknown) => void) {
      maplibre.handlers.set(name, handler)
      return this
    }
    off(name: string) {
      maplibre.handlers.delete(name)
      return this
    }
    addControl() {
      return this
    }
    removeControl() {
      return this
    }
    remove() {
      maplibre.removed()
    }
    getZoom() {
      return 3
    }
    getBounds() {
      return { getWest: () => -10, getSouth: () => 40, getEast: () => 10, getNorth: () => 60 }
    }
  }
  class Control {}
  const module = { Map: FakeMap, NavigationControl: Control, ScaleControl: Control }
  return { ...module, default: module }
})

vi.mock('@deck.gl/mapbox', () => ({ MapboxOverlay: class {} }))

const HOST_ID = 'mount-test'

/** Mount the map, wait for it to report ready, run `interact`, then unmount. */
const mountAndInteract = (interact: () => void) =>
  Effect.runPromise(
    Effect.scoped(
      Effect.gen(function* () {
        const received: Array<Message> = []
        const ready = yield* Deferred.make<void>()
        yield* MountMap({ hostId: HOST_ID, basemap: 'Dark' })
          .f(document.createElement('div'), Stream.empty)
          .pipe(
            Stream.runForEach(message =>
              Effect.sync(() => {
                received.push(message)
                if (message._tag === 'MovedMap') {
                  Effect.runSync(Deferred.succeed(ready, undefined))
                }
              }),
            ),
            Effect.forkScoped,
          )
        yield* Deferred.await(ready)
        interact()
        yield* Effect.yieldNow
        return received
      }),
    ),
  )

describe('MountMap', () => {
  beforeEach(() => {
    maplibre.handlers.clear()
    vi.clearAllMocks()
  })

  test('creates the map, registers the host and reports the first view', async () => {
    const messages = await mountAndInteract(() => {
      expect(getHost(HOST_ID)._tag).toBe('Some')
    })
    expect(maplibre.created).toHaveBeenCalledWith(expect.objectContaining({ hash: 'view' }))
    expect(messages.map(message => message._tag)).toEqual(['SucceededMountMap', 'MovedMap'])
  })

  test('turns map events into Messages', async () => {
    const messages = await mountAndInteract(() => {
      maplibre.emit('mousemove', { lngLat: { lat: 51.5, lng: 190 } })
      maplibre.emit('click', { lngLat: { lat: 51.5, lng: -0.1 } })
      maplibre.emit('mouseout')
      maplibre.emit('moveend')
    })
    expect(messages.map(message => message._tag)).toEqual([
      'SucceededMountMap',
      'MovedMap',
      'MovedCursor',
      'ClickedMap',
      'LeftMap',
      'MovedMap',
    ])
    expect(messages[2]).toMatchObject({ point: { lat: 51.5, lon: -170 } })
  })

  test('removes the map and its listeners on unmount', async () => {
    await mountAndInteract(() => undefined)
    expect(maplibre.removed).toHaveBeenCalledOnce()
    expect(maplibre.handlers.size).toBe(0)
    expect(getHost(HOST_ID)._tag).toBe('None')
  })
})
