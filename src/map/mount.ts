import { MapboxOverlay } from '@deck.gl/mapbox'
import { Effect, Queue, Schema, Stream } from 'effect'
import { Mount } from 'foldkit'
import maplibregl, { type Map as MapInstance, type MapMouseEvent } from 'maplibre-gl'

import { Basemap, type LatLon, type MapView } from '../app/domain'
import { wrapLon } from '../geo/ellipsoid'
import { basemapStyles } from './basemaps'
import { type MapHost, removeHost, setHost } from './host'
import { ensureLabelLayer } from './labels'
import { Message } from '../app/message'

type MountMapMessage =
  | typeof Message.SucceededMountMap.Type
  | typeof Message.FailedMountMap.Type
  | typeof Message.CompletedLoadStyle.Type
  | typeof Message.MovedMap.Type
  | typeof Message.MovedCursor.Type
  | typeof Message.LeftMap.Type
  | typeof Message.ClickedMap.Type

const toMountError = (error: unknown): Error =>
  error instanceof Error ? error : new Error(`Failed to mount the map: ${error}`)

export const viewFromMap = (map: MapInstance): MapView => {
  const bounds = map.getBounds()
  return {
    bounds: {
      west: bounds.getWest(),
      south: bounds.getSouth(),
      east: bounds.getEast(),
      north: bounds.getNorth(),
    },
    zoom: map.getZoom(),
  }
}

const pointFromEvent = (event: MapMouseEvent): LatLon => ({
  lat: event.lngLat.lat,
  lon: wrapLon(event.lngLat.lng),
})

const createHost = (element: HTMLElement, basemap: Basemap): MapHost => {
  const map = new maplibregl.Map({
    container: element,
    style: basemapStyles[basemap],
    center: [0, 20],
    zoom: 1.6,
    hash: 'view',
    attributionControl: { compact: true },
  })
  map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right')
  map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'top-right')
  const overlay = new MapboxOverlay({ interleaved: true, layers: [] })
  map.addControl(overlay)
  return { map, overlay }
}

const listenToMap = (map: MapInstance, queue: Queue.Enqueue<MountMapMessage>) =>
  Effect.acquireRelease(
    Effect.sync(() => {
      const offer = (message: MountMapMessage) => Queue.offerUnsafe(queue, message)
      const onStyleLoad = () => {
        ensureLabelLayer(map)
        offer(Message.CompletedLoadStyle())
      }
      const onMoveEnd = () => offer(Message.MovedMap({ view: viewFromMap(map) }))
      const onMouseMove = (event: MapMouseEvent) => offer(Message.MovedCursor({ point: pointFromEvent(event) }))
      const onMouseOut = () => offer(Message.LeftMap())
      const onClick = (event: MapMouseEvent) => offer(Message.ClickedMap({ point: pointFromEvent(event) }))
      map.on('style.load', onStyleLoad)
      map.on('moveend', onMoveEnd)
      map.on('mousemove', onMouseMove)
      map.on('mouseout', onMouseOut)
      map.on('click', onClick)
      return { onStyleLoad, onMoveEnd, onMouseMove, onMouseOut, onClick }
    }),
    handlers =>
      Effect.sync(() => {
        map.off('style.load', handlers.onStyleLoad)
        map.off('moveend', handlers.onMoveEnd)
        map.off('mousemove', handlers.onMouseMove)
        map.off('mouseout', handlers.onMouseOut)
        map.off('click', handlers.onClick)
      }),
  )

const mountMap = (element: Element, hostId: string, basemap: Basemap) =>
  Stream.callback<MountMapMessage>(queue =>
    Effect.gen(function* () {
      if (!(element instanceof HTMLElement)) {
        Queue.offerUnsafe(queue, Message.FailedMountMap({ reason: 'The map host is not an HTMLElement.' }))
        return yield* Effect.never
      }
      const host = yield* Effect.acquireRelease(
        Effect.try({ try: () => createHost(element, basemap), catch: toMountError }),
        acquiredHost => Effect.sync(() => removeHost(hostId, acquiredHost)),
      )
      setHost(hostId, host)
      yield* listenToMap(host.map, queue)

      Queue.offerUnsafe(queue, Message.SucceededMountMap({ hostId }))
      Queue.offerUnsafe(queue, Message.MovedMap({ view: viewFromMap(host.map) }))
      return yield* Effect.never
    }).pipe(
      Effect.catch(error =>
        Effect.sync(() =>
          Queue.offerUnsafe(queue, Message.FailedMountMap({ reason: toMountError(error).message })),
        ),
      ),
    ),
  )

export const MountMap = Mount.defineStream('MountMap', {
  args: { hostId: Schema.String, basemap: Basemap },
  messages: [
    Message.SucceededMountMap,
    Message.FailedMountMap,
    Message.CompletedLoadStyle,
    Message.MovedMap,
    Message.MovedCursor,
    Message.LeftMap,
    Message.ClickedMap,
  ],
  execute: ({ element, hostId, basemap }) => mountMap(element, hostId, basemap),
})
