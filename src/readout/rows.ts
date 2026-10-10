import { Option } from 'effect'
import type { Html, HtmlBuilder } from 'foldkit/html'

import { Button } from '@foldkit/ui'

import type { LatLon } from '../domain'
import { Message } from '../message'
import { CursorState, type Model } from '../model'
import * as Icon from '../ui/icon'

export type CellTone = 'Live' | 'Stale' | 'Cue'

/**
 * One position the readout reports. Each row says where its position comes from and how its
 * cells look; the columns (one per coordinate system) are in columns.ts.
 */
export type ReadoutRow = Readonly<{
  id: 'Cursor' | 'Cue'
  label: string
  iconView: (h: HtmlBuilder<Message>) => Html
  /** Whether the row applies at all; the cursor row needs a pointer that can hover. */
  isAvailable: (model: Model) => boolean
  point: (model: Model) => Option.Option<LatLon.LatLon>
  tone: (model: Model) => CellTone
  actionView: (model: Model, h: HtmlBuilder<Message>) => Html
}>

const cursorRow: ReadoutRow = {
  id: 'Cursor',
  label: 'Cursor',
  iconView: Icon.cross,
  isAvailable: model => model.pointer === 'Hover',
  point: model =>
    CursorState.match(model.cursor, {
      Idle: () => Option.none(),
      OnMap: ({ point }) => Option.some(point),
      OffMap: ({ point }) => Option.some(point),
    }),
  tone: model => (CursorState.guards.OnMap(model.cursor) ? 'Live' : 'Stale'),
  actionView: (_model, h) => h.empty,
}

const clearCueButtonView = (h: HtmlBuilder<Message>): Html =>
  Button.view(
    {
      onClick: Message.ClickedClearCue(),
      toView: attributes =>
        h.button(
          [
            ...attributes.button,
            h.AriaLabel('Clear the cue'),
            h.Title('Clear the cue'),
            h.Class(
              'ml-auto min-h-6 min-w-6 rounded px-1 text-faint outline-hidden hover:text-ink focus-visible:ring-2 focus-visible:ring-focus',
            ),
          ],
          ['×'],
        ),
    },
    h,
  )

const cueRow: ReadoutRow = {
  id: 'Cue',
  label: 'Cue',
  iconView: Icon.cue,
  isAvailable: () => true,
  point: model => model.maybeCue,
  tone: () => 'Cue',
  actionView: (model, h) =>
    Option.match(model.maybeCue, {
      onNone: () => h.empty,
      onSome: () => clearCueButtonView(h),
    }),
}

export const rows: ReadonlyArray<ReadoutRow> = [cursorRow, cueRow]

export const availableRows = (model: Model): ReadonlyArray<ReadoutRow> =>
  rows.filter(row => row.isAvailable(model))
