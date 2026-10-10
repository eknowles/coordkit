import clsx from 'clsx'
import { Option } from 'effect'
import type { Html, HtmlBuilder } from 'foldkit/html'

import { Message } from '../app/message'
import type { Model } from '../app/model'
import type { SystemOptions } from '../systems/types'
import type { ReadoutColumn } from './columns'
import type { CellTone, ReadoutRow } from './rows'

const toneClass: Record<CellTone, string> = {
  Live: 'text-ink',
  Stale: 'text-muted',
  Cue: 'text-cue',
}

export const systemOptions = (model: Model): SystemOptions => ({
  mgrsPrecision: model.settings.mgrsPrecision,
  garsPrecision: model.settings.garsPrecision,
})

const isCopied = (row: ReadoutRow, column: ReadoutColumn, model: Model): boolean =>
  Option.exists(model.maybeCopied, copied => copied.systemId === column.formatter.id && copied.target === row.target)

/** The reading for one row in one system. Click to copy. */
export const readingCellView = (row: ReadoutRow, column: ReadoutColumn, model: Model, h: HtmlBuilder<Message>): Html =>
  Option.match(row.point(model), {
    onNone: () => h.span([h.Class('block px-3 py-1 leading-5 text-faint')], ['—', h.br([]), ' ']),
    onSome: point => {
      const { formatter } = column
      const reading = formatter.format(point, systemOptions(model))
      const showCopied = isCopied(row, column, model)
      return h.button(
        [
          h.Type('button'),
          h.Title(`Copy ${formatter.label} (${row.label.toLowerCase()}): ${reading.copyText}`),
          h.OnClick(Message.ClickedCopy({ systemId: formatter.id, target: row.target, text: reading.copyText })),
          h.Class(
            clsx(
              'block w-full whitespace-nowrap px-3 py-1 text-left leading-5 hover:bg-ink/5',
              toneClass[row.tone(model)],
            ),
          ),
        ],
        [
          h.span([h.Class('block')], [reading.lines[0]]),
          h.span([h.Class(clsx('block', showCopied ? 'text-ok' : 'opacity-80'))], [showCopied ? 'Copied' : reading.lines[1]]),
        ],
      )
    },
  })
