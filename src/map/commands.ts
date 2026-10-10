import { Effect, Option, Schema } from 'effect'
import { Command } from 'foldkit'

import {
  Basemap,
  GarsPrecision,
  GridToggles,
  LatLon,
  MapView,
  MgrsPrecision,
  Projection,
  RingSpacing,
  RingUnit,
} from '../app/domain'
import { Message } from '../app/message'
import { basemapStyles } from './basemaps'
import { type MapHost, getHost } from './host'
import { setLabels } from './labels'
import { buildOverlayFrame } from './overlay'

const withHost = <A>(hostId: string, f: (host: MapHost) => A): Effect.Effect<Option.Option<A>> =>
  Effect.sync(() => Option.map(getHost(hostId), f))

export const RenderOverlay = Command.define('RenderOverlay', {
  args: {
    hostId: Schema.String,
    view: MapView,
    gridToggles: GridToggles,
    showLabels: Schema.Boolean,
    maybeCue: Schema.Option(LatLon),
    mgrsPrecision: MgrsPrecision,
    garsPrecision: GarsPrecision,
    ringSpacing: RingSpacing,
    ringUnit: RingUnit,
    basemap: Basemap,
  },
  messages: [Message.CompletedRenderOverlay],
  execute: ({ hostId, mgrsPrecision, garsPrecision, ...input }) =>
    withHost(hostId, ({ map, overlay }) => {
      const frame = buildOverlayFrame({ ...input, options: { mgrsPrecision, garsPrecision } })
      overlay.setProps({ layers: [...frame.layers] })
      setLabels(map, frame.labels)
    }).pipe(Effect.ignore, Effect.as(Message.CompletedRenderOverlay())),
})

export const SetBasemap = Command.define('SetBasemap', {
  args: { hostId: Schema.String, basemap: Basemap },
  messages: [Message.CompletedSetBasemap],
  execute: ({ hostId, basemap }) =>
    withHost(hostId, ({ map }) =>
      // NOTE: a diffed style swap drops the grid label layer and skips 'style.load', which re-adds it.
      map.setStyle(basemapStyles[basemap], { diff: false }),
    ).pipe(Effect.ignore, Effect.as(Message.CompletedSetBasemap())),
})

export const SetProjection = Command.define('SetProjection', {
  args: { hostId: Schema.String, projection: Projection },
  messages: [Message.CompletedSetProjection],
  execute: ({ hostId, projection }) =>
    withHost(hostId, ({ map }) => map.setProjection({ type: projection === 'Globe' ? 'globe' : 'mercator' })).pipe(
      Effect.ignore,
      Effect.as(Message.CompletedSetProjection()),
    ),
})

const SEARCH_ZOOM = 12

export const MoveCamera = Command.define('MoveCamera', {
  args: {
    hostId: Schema.String,
    point: LatLon,
    maybeBounds: Schema.Option(Schema.Tuple([Schema.Number, Schema.Number, Schema.Number, Schema.Number])),
  },
  messages: [Message.CompletedMoveCamera],
  execute: ({ hostId, point, maybeBounds }) =>
    withHost(hostId, ({ map }) =>
      Option.match(maybeBounds, {
        onNone: () =>
          map.flyTo({ center: [point.lon, point.lat], zoom: Math.max(map.getZoom(), SEARCH_ZOOM), duration: 1200 }),
        onSome: ([west, south, east, north]) =>
          map.fitBounds(
            [
              [west, south],
              [east, north],
            ],
            { padding: 120, maxZoom: 14, duration: 1200 },
          ),
      }),
    ).pipe(Effect.ignore, Effect.as(Message.CompletedMoveCamera())),
})
