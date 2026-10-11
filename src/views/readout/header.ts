import { Option } from 'effect'
import type { Html, HtmlBuilder } from 'foldkit/html'

import type { Message } from '@/message'
import type { Model } from '@/model'

import { isGridEnabled } from '../../core/systems/registry'
import * as Swatch from '../ui/swatch'
import type { ReadoutColumn } from './columns'
import type { ReadoutRow } from './rows'

/** A system's name with its grid colour; dimmed when that grid is off. */
export const systemLabelView = (
  column: ReadoutColumn,
  model: Model,
  h: HtmlBuilder<Message>,
): Html =>
  h.span(
    [h.Class('flex items-center gap-1.5')],
    [
      Option.match(column.maybeGrid, {
        onNone: () =>
          h.span([
            h.Class('inline-block h-2 w-2 shrink-0'),
            h.AriaHidden(true),
          ]),
        onSome: grid =>
          Swatch.view(
            grid,
            !isGridEnabled(model.settings.values.grids, grid),
            h,
          ),
      }),
      column.formatter.label,
    ],
  )

export const positionLabelView = (
  row: ReadoutRow,
  model: Model,
  h: HtmlBuilder<Message>,
): Html =>
  h.span(
    [h.Class('flex w-full items-center gap-2')],
    [row.iconView(h), row.label, row.actionView(model, h)],
  )
