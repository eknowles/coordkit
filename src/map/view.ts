import { CustomElement } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'

import { Message } from '../message'
import { MapState, type Model } from '../model'
import { MAP_TAG } from './element'
import { mapEventFields, mapPropertyFields } from './properties'

/** The typed binding for `<coordkit-map>` (element.ts): properties in, events out. */
export const coordkitMap = CustomElement.define({
  tag: MAP_TAG,
  properties: mapPropertyFields,
  events: mapEventFields,
})

/** Every property comes from the Model, so any render, including a time-travel replay, sets the map. */
export const view = (model: Model, h: HtmlBuilder<Message>): Html => {
  const map = coordkitMap.withMessage(h)
  const { values } = model.settings
  return map([
    h.Class('ck-map block h-full w-full'),
    h.Role('region'),
    h.AriaLabel('Map. Click to set the cue, or set it with the search field.'),
    map.Basemap(values.basemap),
    map.Projection(values.projection),
    map.GridToggles(values.grids),
    map.IsGridLabelsVisible(values.isGridLabelsVisible),
    map.Cue(model.maybeCue),
    map.MgrsPrecision(values.mgrsPrecision),
    map.GarsPrecision(values.garsPrecision),
    map.IsRangeRingsVisible(values.isRangeRingsVisible),
    map.RingSpacing(values.ringSpacing),
    map.RingUnit(values.ringUnit),
    map.Camera(model.maybeCamera),
    map.CameraRequest(model.maybeCameraRequest),
    map.OnMapReady(() => Message.LoadedMap()),
    map.OnMapFailed(({ reason }) => Message.FailedLoadMap({ reason })),
    map.OnMapMoved(camera => Message.MovedMap({ camera })),
    map.OnCursorMoved(point => Message.MovedCursor({ point })),
    map.OnCursorLeft(() => Message.LeftMap()),
    map.OnMapClicked(point => Message.ClickedMap({ point })),
  ])
}

/** Shown over the map when MapLibre cannot start, for example without WebGL. */
export const errorView = (model: Model, h: HtmlBuilder<Message>): Html =>
  MapState.match(model.mapState, {
    Loading: () => h.empty,
    Ready: () => h.empty,
    Failed: ({ reason }) =>
      h.div(
        [
          h.Role('alert'),
          h.Class(
            'absolute left-1/2 top-3 -translate-x-1/2 rounded-md border border-danger/50 bg-panel px-4 py-3 text-sm text-ink',
          ),
        ],
        [
          h.div([h.Class('font-semibold')], ['Could not load the map.']),
          h.div([h.Class('text-xs')], [reason]),
        ],
      ),
  })
