import { Option } from 'effect'
import type { Html, HtmlBuilder } from 'foldkit/html'

import * as Copy from '../copy'
import { Message } from '../message'
import type { Model } from '../model'
import type { SystemOptions } from '../systems/types'
import type { ReadoutColumn } from './columns'
import type { CellTone, ReadoutRow } from './rows'

const toneClass: Record<CellTone, string> = {
  Live: 'text-ink',
  Stale: 'text-muted',
  Cue: 'text-cue',
}

const systemOptions = (model: Model): SystemOptions => ({
  mgrsPrecision: model.settings.values.mgrsPrecision,
  garsPrecision: model.settings.values.garsPrecision,
})

/** The reading for one row in one system. Click to copy. */
export const view = (
  row: ReadoutRow,
  column: ReadoutColumn,
  model: Model,
  h: HtmlBuilder<Message>,
): Html =>
  Option.match(row.point(model), {
    onNone: () =>
      h.span(
        [h.Class('block px-3 py-1 leading-5 text-faint')],
        [h.span([h.AriaHidden(true)], ['—']), h.br([]), ' '],
      ),
    onSome: point => {
      const { formatter } = column
      const reading = formatter.format(point, systemOptions(model))
      const cellId = `${row.id}-${formatter.id}`
      return h.submodel({
        slotId: `copy-${cellId}`,
        model: model.copy,
        view: Copy.view,
        viewInputs: {
          cellId,
          text: reading.copyText,
          ariaLabel: `${row.label} ${formatter.label}: ${reading.copyText}. Copy`,
          lines: reading.lines,
          toneClass: toneClass[row.tone(model)],
        },
        toParentMessage: message => Message.GotCopyMessage({ message }),
      })
    },
  })
