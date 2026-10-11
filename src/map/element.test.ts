import { Option } from 'effect'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import { CameraRequest } from '../domain'
import { defaultGridToggles } from '../systems/registry'

const fake = vi.hoisted(() => {
  const handlers = new Map<string, (event?: unknown) => void>()
  const state = { center: { lat: 20, lng: 0 }, zoom: 1.6, bearing: 0, pitch: 0 }
  const map = {
    created: vi.fn(),
    setStyle: vi.fn(),
    setProjection: vi.fn(),
    jumpTo: vi.fn(),
    flyTo: vi.fn(),
    fitBounds: vi.fn(),
    remove: vi.fn(),
    setData: vi.fn(),
    isStyleLoaded: false,
  }
  const sources = new Map<string, unknown>()
  return {
    handlers,
    sources,
    state,
    map,
    emit: (name: string, event?: unknown) => handlers.get(name)?.(event),
  }
})

vi.mock('maplibre-gl', () => {
  class FakeMap {
    constructor(options: unknown) {
      fake.map.created(options)
    }
    on(name: string, handler: (event?: unknown) => void) {
      fake.handlers.set(name, handler)
      return this
    }
    off(name: string) {
      fake.handlers.delete(name)
      return this
    }
    addControl() {
      return this
    }
    removeControl() {
      return this
    }
    remove() {
      fake.map.remove()
    }
    getZoom() {
      return fake.state.zoom
    }
    getCenter() {
      return fake.state.center
    }
    getBearing() {
      return fake.state.bearing
    }
    getPitch() {
      return fake.state.pitch
    }
    flyTo(...args: Array<unknown>) {
      fake.map.flyTo(...args)
    }
    fitBounds(...args: Array<unknown>) {
      fake.map.fitBounds(...args)
    }
    getBounds() {
      return {
        getWest: () => -10,
        getSouth: () => 40,
        getEast: () => 10,
        getNorth: () => 60,
      }
    }
    setStyle(...args: Array<unknown>) {
      fake.map.setStyle(...args)
    }
    setProjection(...args: Array<unknown>) {
      fake.map.setProjection(...args)
    }
    jumpTo(...args: Array<unknown>) {
      fake.map.jumpTo(...args)
    }
    getSource(id: string) {
      return fake.sources.get(id)
    }
    addSource(id: string) {
      if (!fake.map.isStyleLoaded) {
        throw new Error('Style is not done loading')
      }
      fake.sources.set(id, {
        setData: (data: unknown) => fake.map.setData(id, data),
      })
    }
    addLayer() {}
  }
  class Control {}
  const module = {
    Map: FakeMap,
    NavigationControl: Control,
    ScaleControl: Control,
  }
  return { ...module, default: module }
})

const { CoordkitMapElement, MAP_TAG, defineMapElement } =
  await import('./element')

const EVENT_NAMES = [
  'map-ready',
  'map-failed',
  'map-moved',
  'cursor-moved',
  'cursor-left',
  'map-clicked',
]

const LONDON_CAMERA = {
  center: { lat: 51.5, lon: -0.1 },
  zoom: 9,
  bearing: 30,
  pitch: 45,
}

const flush = () => new Promise<void>(resolve => queueMicrotask(resolve))

/** The `layer` property of each line feature the element last drew. */
const lineLayers = (): Array<string> => {
  const lineCalls = fake.map.setData.mock.calls.filter(
    ([id]) => id === 'overlay-lines',
  )
  const [, data] = lineCalls.at(-1)!
  return data.features.map(
    (feature: { properties: { layer: string } }) => feature.properties.layer,
  )
}

/** Make an element, let the test set its first properties, then put it on the page. */
const mountElement = (
  setUp: (element: InstanceType<typeof CoordkitMapElement>) => void = () => {},
) => {
  defineMapElement()
  const element = new CoordkitMapElement()
  const events: Array<{ name: string; detail: unknown }> = []
  EVENT_NAMES.forEach(name =>
    element.addEventListener(name, event =>
      events.push({
        name,
        detail: event instanceof CustomEvent ? event.detail : undefined,
      }),
    ),
  )
  element.setMapProperty('basemap', 'Dark')
  setUp(element)
  document.body.append(element)
  return { element, events }
}

beforeEach(() => {
  fake.handlers.clear()
  fake.state.center = { lat: 20, lng: 0 }
  fake.state.zoom = 1.6
  fake.state.bearing = 0
  fake.state.pitch = 0
  fake.map.isStyleLoaded = false
  fake.sources.clear()
  vi.clearAllMocks()
})

afterEach(() => {
  document.body.replaceChildren()
})

describe('<coordkit-map>', () => {
  test('registers its tag once', () => {
    defineMapElement()
    defineMapElement()
    expect(customElements.get(MAP_TAG)).toBe(CoordkitMapElement)
  })

  test('starts at the camera property, without a URL hash, and reports where it is', () => {
    const { events } = mountElement(element =>
      element.setMapProperty('camera', Option.some(LONDON_CAMERA)),
    )
    const options = fake.map.created.mock.lastCall![0]
    expect(options).toEqual(
      expect.objectContaining({
        center: [-0.1, 51.5],
        zoom: 9,
        bearing: 30,
        pitch: 45,
      }),
    )
    expect(options).not.toHaveProperty('hash')
    expect(events).toEqual([
      {
        name: 'map-moved',
        detail: {
          center: { lat: 20, lon: 0 },
          zoom: 1.6,
          bearing: 0,
          pitch: 0,
        },
      },
    ])
  })

  test('reports that it is ready once the map has loaded', () => {
    const { events } = mountElement()
    expect(events.map(({ name }) => name)).not.toContain('map-ready')
    fake.emit('load')
    expect(events.at(-1)).toEqual({ name: 'map-ready', detail: {} })
  })

  test('starts at the whole world without a camera', () => {
    mountElement()
    expect(fake.map.created).toHaveBeenCalledWith(
      expect.objectContaining({ center: [0, 20], zoom: 1.6 }),
    )
  })

  test('takes properties by assignment, as Snabbdom sets them, and redraws the overlay', async () => {
    const { element } = mountElement()
    Reflect.set(element, 'cue', Option.some({ lat: 51.5, lon: 0 }))
    Reflect.set(element, 'gridToggles', { ...defaultGridToggles(), Gars: true })
    expect(Reflect.get(element, 'gridToggles')).toEqual(
      expect.objectContaining({ Gars: true }),
    )
    fake.map.isStyleLoaded = true
    fake.emit('style.load')
    await flush()
    expect(lineLayers()).toEqual(
      expect.arrayContaining(['Graticule', 'range-rings', 'cue-cells']),
    )
    Reflect.set(element, 'isRangeRingsVisible', false)
    await flush()
    expect(lineLayers()).not.toContain('range-rings')
  })

  test('swaps the whole style for a new base map and applies the projection once the style loads', async () => {
    const { element } = mountElement()
    element.setMapProperty('basemap', 'Light')
    element.setMapProperty('projection', 'Globe')
    await flush()
    expect(fake.map.setStyle).toHaveBeenCalledWith(
      expect.stringContaining('positron'),
      { diff: false },
    )
    expect(fake.map.setProjection).not.toHaveBeenCalled()
    fake.emit('style.load')
    expect(fake.map.setProjection).toHaveBeenCalledWith({ type: 'globe' })
  })

  test('jumps the camera when the camera property changes, as in time travel', async () => {
    const { element } = mountElement()
    element.setMapProperty('camera', Option.some(LONDON_CAMERA))
    await flush()
    expect(fake.map.jumpTo).toHaveBeenCalledWith({
      center: [-0.1, 51.5],
      zoom: 9,
      bearing: 30,
      pitch: 45,
    })

    fake.map.jumpTo.mockClear()
    element.setMapProperty('cue', Option.some({ lat: 0, lon: 0 }))
    await flush()
    expect(fake.map.jumpTo).not.toHaveBeenCalled()
  })

  test('does not move a map that is already at the camera', async () => {
    const { element } = mountElement()
    fake.state.center = { lat: 51.5, lng: -0.1 }
    fake.state.zoom = 9
    fake.state.bearing = 30
    fake.state.pitch = 45
    element.setMapProperty('camera', Option.some(LONDON_CAMERA))
    await flush()
    expect(fake.map.jumpTo).not.toHaveBeenCalled()
  })

  test('flies to each new camera request once', async () => {
    const { element } = mountElement()
    const request = Option.some({
      id: 0,
      target: CameraRequest.CameraTarget.FlyTo({
        point: { lat: 51.5, lon: -0.1 },
      }),
    })
    element.setMapProperty('cameraRequest', request)
    await flush()
    element.setMapProperty('cue', Option.none())
    await flush()
    expect(fake.map.flyTo).toHaveBeenCalledOnce()
    expect(fake.map.flyTo).toHaveBeenCalledWith(
      expect.objectContaining({ center: [-0.1, 51.5], zoom: 12 }),
    )
  })

  test('does not fly again for a copy of a request it has already made', async () => {
    const { element } = mountElement()
    const target = CameraRequest.CameraTarget.FlyTo({
      point: { lat: 51.5, lon: -0.1 },
    })
    element.setMapProperty('cameraRequest', Option.some({ id: 3, target }))
    await flush()
    element.setMapProperty('cameraRequest', Option.some({ id: 3, target }))
    await flush()
    expect(fake.map.flyTo).toHaveBeenCalledOnce()
    element.setMapProperty('cameraRequest', Option.some({ id: 4, target }))
    await flush()
    expect(fake.map.flyTo).toHaveBeenCalledTimes(2)
  })

  test('fits the map to a requested area', async () => {
    const { element } = mountElement()
    element.setMapProperty(
      'cameraRequest',
      Option.some({
        id: 1,
        target: CameraRequest.CameraTarget.FitBox({ box: [-1, 51, 1, 52] }),
      }),
    )
    await flush()
    expect(fake.map.fitBounds).toHaveBeenCalledWith(
      [
        [-1, 51],
        [1, 52],
      ],
      expect.objectContaining({ maxZoom: 14 }),
    )
  })

  test('turns map events into CustomEvents', () => {
    const { events } = mountElement()
    fake.emit('mousemove', { lngLat: { lat: 51.5, lng: 190 } })
    fake.emit('click', { lngLat: { lat: 51.5, lng: -0.1 } })
    fake.emit('mouseout')
    fake.emit('moveend')
    expect(events.slice(1)).toEqual([
      { name: 'cursor-moved', detail: { lat: 51.5, lon: -170 } },
      { name: 'map-clicked', detail: { lat: 51.5, lon: -0.1 } },
      { name: 'cursor-left', detail: {} },
      {
        name: 'map-moved',
        detail: {
          center: { lat: 20, lon: 0 },
          zoom: 1.6,
          bearing: 0,
          pitch: 0,
        },
      },
    ])
  })

  test('reports an error before the first load as a failure, and ignores later ones', () => {
    const { events } = mountElement()
    fake.emit('error', { error: new Error('Style not found') })
    fake.emit('load')
    fake.emit('error', { error: new Error('Tile not found') })
    expect(events.filter(event => event.name === 'map-failed')).toEqual([
      { name: 'map-failed', detail: { reason: 'Style not found' } },
    ])
  })

  test('removes the map and its listeners when it leaves the page', () => {
    const { element } = mountElement()
    element.remove()
    expect(fake.map.remove).toHaveBeenCalledOnce()
    expect(fake.handlers.size).toBe(0)
  })

  test('reports a map that cannot be created', () => {
    fake.map.created.mockImplementationOnce(() => {
      throw new Error('WebGL is not supported')
    })
    const { element, events } = mountElement()
    expect(events).toEqual([
      { name: 'map-failed', detail: { reason: 'WebGL is not supported' } },
    ])
    element.remove()
    expect(events).toHaveLength(1)
  })
})
