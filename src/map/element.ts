import { Option } from 'effect'
import maplibregl, {
  type Map as MapInstance,
  type MapMouseEvent,
} from 'maplibre-gl'

import { Camera, type LatLon } from '../core/domain'
import { wrapLon } from '../core/geo/ellipsoid'
import type { Box } from '../core/geo/geometry'
import { basemapStyles } from './basemaps'
import * as CameraRequest from './cameraRequest'
import { ensureOverlayLayers, setOverlay } from './layers'
import { buildOverlayFrame } from './overlay'
import {
  type MapProperties,
  initialMapProperties,
  mapPropertyNames,
} from './properties'

export const MAP_TAG = 'coordkit-map'

const DEFAULT_CAMERA: Camera.Camera = {
  center: { lat: 20, lon: 0 },
  zoom: 1.6,
  bearing: 0,
  pitch: 0,
}

const FLIGHT_DURATION_MS = 1200
const FLIGHT_MIN_ZOOM = 12
const FIT_PADDING = 120
const FIT_MAX_ZOOM = 14

const cameraOf = (map: MapInstance): Camera.Camera => {
  const centre = map.getCenter()
  return {
    center: { lat: centre.lat, lon: wrapLon(centre.lng) },
    zoom: map.getZoom(),
    bearing: map.getBearing(),
    pitch: map.getPitch(),
  }
}

const boundsOf = (map: MapInstance): Box => {
  const bounds = map.getBounds()
  return [
    bounds.getWest(),
    bounds.getSouth(),
    bounds.getEast(),
    bounds.getNorth(),
  ]
}

const pointOf = (event: MapMouseEvent): LatLon.LatLon => ({
  lat: event.lngLat.lat,
  lon: wrapLon(event.lngLat.lng),
})

const requestIdOf = (
  maybeRequest: Option.Option<CameraRequest.CameraRequest>,
): number | undefined =>
  Option.getOrUndefined(Option.map(maybeRequest, ({ id }) => id))

const errorReason = (error: unknown): string =>
  error instanceof Error ? error.message : String(error)

type Host = Readonly<{ map: MapInstance }>

type AppliedKey = 'basemap' | 'projection' | 'camera'
type Applied = { -readonly [K in AppliedKey]?: MapProperties[K] } & {
  cameraRequestId?: number | undefined
}

/**
 * `<coordkit-map>`: MapLibre behind a custom element. The view sets its properties
 * from the Model on every render, and the element redraws to match, so the map is a function of
 * the Model and DevTools time travel moves it too. Map events leave as CustomEvents, which the
 * view turns into Messages (see mapEventFields).
 */
export class CoordkitMapElement extends HTMLElement {
  #properties: MapProperties = initialMapProperties
  /** What the map shows now, so each sync applies only what changed. */
  #applied: Applied = {}
  #maybeHost: Option.Option<Host> = Option.none()
  #isStyleReady = false
  #isLoaded = false
  #isSyncQueued = false
  #removeListeners: () => void = () => {}

  connectedCallback(): void {
    try {
      const host = this.#createHost()
      this.#maybeHost = Option.some(host)
      this.#removeListeners = this.#listen(host.map)
      this.#emit('map-moved', cameraOf(host.map))
    } catch (error) {
      this.#emit('map-failed', { reason: errorReason(error) })
    }
  }

  // NOTE: Snabbdom removes the element's event listeners before this runs, so nothing is emitted here.
  disconnectedCallback(): void {
    this.#removeListeners()
    if (Option.isSome(this.#maybeHost)) {
      this.#maybeHost.value.map.remove()
    }
    this.#maybeHost = Option.none()
    this.#isStyleReady = false
    this.#isLoaded = false
    this.#applied = {}
  }

  setMapProperty<K extends keyof MapProperties>(
    name: K,
    value: MapProperties[K],
  ): void {
    this.#properties = { ...this.#properties, [name]: value }
    this.#queueSync()
  }

  getMapProperty<K extends keyof MapProperties>(name: K): MapProperties[K] {
    return this.#properties[name]
  }

  #createHost(): Host {
    const properties = this.#properties
    const camera = Option.getOrElse(properties.camera, () => DEFAULT_CAMERA)
    const map = new maplibregl.Map({
      container: this,
      style: basemapStyles[properties.basemap],
      center: [camera.center.lon, camera.center.lat],
      zoom: camera.zoom,
      bearing: camera.bearing,
      pitch: camera.pitch,
      attributionControl: { compact: true },
    })
    map.addControl(
      new maplibregl.NavigationControl({ visualizePitch: true }),
      'top-right',
    )
    map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'top-right')
    // NOTE: the map starts where these properties say, so the first sync must not move it again.
    this.#applied = {
      basemap: properties.basemap,
      camera: properties.camera,
      cameraRequestId: requestIdOf(properties.cameraRequest),
    }
    return { map }
  }

  #listen(map: MapInstance): () => void {
    const onStyleLoad = () => {
      this.#isStyleReady = true
      ensureOverlayLayers(map)
      delete this.#applied.projection
      this.#sync()
    }
    const onLoad = () => {
      this.#isLoaded = true
      this.#emit('map-ready', {})
    }
    // NOTE: a tile that fails later is not fatal, but failing before the first load is.
    const onError = (event: { error?: unknown }) => {
      if (!this.#isLoaded) {
        this.#emit('map-failed', { reason: errorReason(event.error) })
      }
    }
    const onMoveEnd = () => {
      this.#renderOverlay()
      this.#emit('map-moved', cameraOf(map))
    }
    const onMouseMove = (event: MapMouseEvent) =>
      this.#emit('cursor-moved', pointOf(event))
    const onMouseOut = () => this.#emit('cursor-left', {})
    const onClick = (event: MapMouseEvent) =>
      this.#emit('map-clicked', pointOf(event))
    map.on('style.load', onStyleLoad)
    map.on('load', onLoad)
    map.on('error', onError)
    map.on('moveend', onMoveEnd)
    map.on('mousemove', onMouseMove)
    map.on('mouseout', onMouseOut)
    map.on('click', onClick)
    return () => {
      map.off('style.load', onStyleLoad)
      map.off('load', onLoad)
      map.off('error', onError)
      map.off('moveend', onMoveEnd)
      map.off('mousemove', onMouseMove)
      map.off('mouseout', onMouseOut)
      map.off('click', onClick)
    }
  }

  /** Several properties change in one render; apply them together once it finishes. */
  #queueSync(): void {
    if (this.#isSyncQueued) {
      return
    }
    this.#isSyncQueued = true
    queueMicrotask(() => {
      this.#isSyncQueued = false
      this.#sync()
    })
  }

  #sync(): void {
    if (Option.isSome(this.#maybeHost)) {
      const { map } = this.#maybeHost.value
      this.#syncStyle(map)
      this.#syncProjection(map)
      this.#syncCamera(map)
      this.#syncCameraRequest(map)
      this.#renderOverlay()
    }
  }

  #syncStyle(map: MapInstance): void {
    const { basemap } = this.#properties
    if (basemap === this.#applied.basemap) {
      return
    }
    this.#applied.basemap = basemap
    this.#isStyleReady = false
    // NOTE: a diffed style swap drops the grid label layer and skips 'style.load', which re-adds it.
    map.setStyle(basemapStyles[basemap], { diff: false })
  }

  #syncProjection(map: MapInstance): void {
    const { projection } = this.#properties
    if (!this.#isStyleReady || projection === this.#applied.projection) {
      return
    }
    this.#applied.projection = projection
    map.setProjection({ type: projection === 'Globe' ? 'globe' : 'mercator' })
  }

  // NOTE: jump only when the camera property itself changes. While the map pans or flies, the
  // property keeps its last value, so renders during the movement never pull the map back.
  #syncCamera(map: MapInstance): void {
    const { camera } = this.#properties
    if (camera === this.#applied.camera) {
      return
    }
    this.#applied.camera = camera
    if (
      Option.isSome(camera) &&
      !Camera.isSameView(cameraOf(map), camera.value)
    ) {
      const { center, zoom, bearing, pitch } = camera.value
      map.jumpTo({ center: [center.lon, center.lat], zoom, bearing, pitch })
    }
  }

  /** Each new request id is one animated move. A copy of the same request, as after a hot reload, does not move the map again. */
  #syncCameraRequest(map: MapInstance): void {
    const { cameraRequest } = this.#properties
    const requestId = requestIdOf(cameraRequest)
    if (requestId === this.#applied.cameraRequestId) {
      return
    }
    this.#applied.cameraRequestId = requestId
    if (Option.isNone(cameraRequest)) {
      return
    }
    CameraRequest.CameraTarget.match(cameraRequest.value.target, {
      FlyTo: ({ point }) =>
        map.flyTo({
          center: [point.lon, point.lat],
          zoom: Math.max(map.getZoom(), FLIGHT_MIN_ZOOM),
          duration: FLIGHT_DURATION_MS,
        }),
      FitBox: ({ box: [west, south, east, north] }) =>
        map.fitBounds(
          [
            [west, south],
            [east, north],
          ],
          {
            padding: FIT_PADDING,
            maxZoom: FIT_MAX_ZOOM,
            duration: FLIGHT_DURATION_MS,
          },
        ),
    })
  }

  #renderOverlay(): void {
    if (Option.isSome(this.#maybeHost)) {
      const { map } = this.#maybeHost.value
      const properties = this.#properties
      const frame = buildOverlayFrame({
        gridToggles: properties.gridToggles,
        isGridLabelsVisible: properties.isGridLabelsVisible,
        bounds: boundsOf(map),
        zoom: map.getZoom(),
        maybeCue: properties.cue,
        options: {
          mgrsPrecision: properties.mgrsPrecision,
          garsPrecision: properties.garsPrecision,
          tileZoom: properties.tileZoom,
        },
        isRangeRingsVisible: properties.isRangeRingsVisible,
        ringSpacing: properties.ringSpacing,
        ringUnit: properties.ringUnit,
        basemap: properties.basemap,
      })
      setOverlay(map, frame)
    }
  }

  #emit(name: string, detail: unknown): void {
    this.dispatchEvent(new CustomEvent(name, { detail }))
  }
}

// NOTE: Snabbdom sets properties by assignment, so each one gets an accessor on the prototype.
mapPropertyNames.forEach(name => {
  Object.defineProperty(CoordkitMapElement.prototype, name, {
    configurable: true,
    get(this: CoordkitMapElement) {
      return this.getMapProperty(name)
    },
    set(this: CoordkitMapElement, value: MapProperties[typeof name]) {
      this.setMapProperty(name, value)
    },
  })
})

export const defineMapElement = (): void => {
  if (!customElements.get(MAP_TAG)) {
    customElements.define(MAP_TAG, CoordkitMapElement)
  }
}
