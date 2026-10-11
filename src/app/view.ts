import type { Document, HtmlBuilder } from 'foldkit/html'

import * as CoordkitMap from '../map'
import * as Settings from '../submodels/settings'
import * as Readout from '../views/readout'
import * as Toolbar from '../views/toolbar'
import { Message } from './message'
import type { Model } from './model'

export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: 'CoordKit',
  body: h.div(
    [h.Class('flex h-dvh w-screen flex-col bg-surface text-ink')],
    [
      Toolbar.view(model, h),
      h.div(
        [h.Class('flex min-h-0 flex-1')],
        [
          h.main(
            [h.Class('relative min-h-0 min-w-0 flex-1 overflow-hidden')],
            [
              CoordkitMap.view(model, h),
              CoordkitMap.errorView(model, h),
              model.layout === 'Compact'
                ? Readout.sheetView(model, h)
                : h.empty,
            ],
          ),
          model.layout === 'Wide'
            ? h.submodel({
                slotId: 'settings-panel',
                model: model.settings,
                view: Settings.sidePanelView,
                toParentMessage: message =>
                  Message.GotSettingsMessage({ message }),
              })
            : h.empty,
        ],
      ),
      model.layout === 'Wide' ? Readout.tableView(model, h) : h.empty,
    ],
  ),
})
