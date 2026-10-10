import type { Html, HtmlBuilder } from 'foldkit/html'

import { MapState } from '../app/domain'
import type { Message } from '../app/message'
import type { Model } from '../app/model'
import { MountMap } from './mount'

const HOST_ID = 'coordkit-map'

export const mapHostView = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.div([
    h.Class('ck-map h-full w-full'),
    h.AriaLabel('Map. Click to set the cue.'),
    h.OnMount(MountMap({ hostId: HOST_ID, basemap: model.settings.basemap })),
  ])

export const mapErrorView = (model: Model, h: HtmlBuilder<Message>): Html =>
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
        [h.div([h.Class('font-semibold')], ['Could not load the map.']), h.div([h.Class('text-xs')], [reason])],
      ),
  })
