import type { Document, HtmlBuilder } from 'foldkit/html'

import { mapErrorView, mapHostView } from '../map/view'
import { readoutBarView } from '../readout/view'
import { toolbarView } from '../toolbar/view'
import type { Message } from './message'
import type { Model } from './model'

export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: 'CoordKit',
  body: h.div(
    [h.Class('flex h-dvh w-screen flex-col bg-surface text-ink')],
    [
      toolbarView(model, h),
      h.main([h.Class('relative min-h-0 flex-1')], [mapHostView(model, h), mapErrorView(model, h)]),
      readoutBarView(model, h),
    ],
  ),
})
