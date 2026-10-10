import { Option } from 'effect'
import type { Html, HtmlBuilder } from 'foldkit/html'

import type { Message } from '../app/message'
import type { Model } from '../app/model'
import { isGridEnabled } from '../systems/registry'
import { gridSwatchView } from '../ui/swatch'
import type { ReadoutColumn } from './columns'
import type { ReadoutRow } from './rows'

/** A system's name with its grid colour; dimmed when that grid is off. */
export const systemLabelView = (column: ReadoutColumn, model: Model, h: HtmlBuilder<Message>): Html =>
  h.span(
    [h.Class('flex items-center gap-1.5')],
    [
      Option.match(column.maybeGrid, {
        onNone: () => h.span([h.Class('inline-block h-2 w-2 shrink-0'), h.AriaHidden(true)]),
        onSome: grid => gridSwatchView(grid, 'Square', !isGridEnabled(model.settings.grids, grid), h),
      }),
      column.formatter.label,
    ],
  )

export const positionLabelView = (row: ReadoutRow, model: Model, h: HtmlBuilder<Message>): Html =>
  h.span([h.Class('flex items-center gap-2')], [row.iconView(h), row.label, row.actionView(model, h)])
