/**
 * The readout's rows: the positions it reports. Each row says where its position comes from
 * and how its cells look; the columns (one per coordinate system) are in columns.ts.
 */
import { Option } from 'effect'
import type { Html, HtmlBuilder } from 'foldkit/html'

import { CursorState, type LatLon, type Target } from '../app/domain'
import { Message } from '../app/message'
import type { Model } from '../app/model'
import { crossIconView, cueIconView } from '../ui/icons'

export type CellTone = 'Live' | 'Stale' | 'Cue'

export type ReadoutRow = Readonly<{
  target: Target
  label: string
  iconView: (h: HtmlBuilder<Message>) => Html
  /** Whether the row applies at all; the cursor row needs a pointer that can hover. */
  isAvailable: (model: Model) => boolean
  point: (model: Model) => Option.Option<LatLon>
  tone: (model: Model) => CellTone
  actionView: (model: Model, h: HtmlBuilder<Message>) => Html
}>

const cursorRow: ReadoutRow = {
  target: 'Cursor',
  label: 'Cursor',
  iconView: crossIconView,
  isAvailable: model => model.pointer === 'Hover',
  point: model =>
    CursorState.match(model.cursor, {
      Idle: () => Option.none(),
      OnMap: ({ point }) => Option.some(point),
      OffMap: ({ point }) => Option.some(point),
    }),
  tone: model => (model.cursor._tag === 'OnMap' ? 'Live' : 'Stale'),
  actionView: (_model, h) => h.empty,
}

const cueRow: ReadoutRow = {
  target: 'Cue',
  label: 'Cue',
  iconView: cueIconView,
  isAvailable: () => true,
  point: model => model.maybeCue,
  tone: () => 'Cue',
  actionView: (model, h) =>
    Option.match(model.maybeCue, {
      onNone: () => h.empty,
      onSome: () =>
        h.button(
          [
            h.Type('button'),
            h.Class('ml-auto rounded px-1 text-faint hover:text-ink'),
            h.AriaLabel('Clear the cue'),
            h.Title('Clear the cue'),
            h.OnClick(Message.ClickedClearCue()),
          ],
          ['×'],
        ),
    }),
}

export const rows: ReadonlyArray<ReadoutRow> = [cursorRow, cueRow]

export const availableRows = (model: Model): ReadonlyArray<ReadoutRow> => rows.filter(row => row.isAvailable(model))
