import { Array } from 'effect'
import type { Html, HtmlBuilder } from 'foldkit/html'

import { SearchState } from '../app/domain'
import { Message } from '../app/message'
import type { Model } from '../app/model'
import { parsers } from '../systems/registry'

const acceptedFormats = `Accepts ${Array.map(parsers, parser => parser.label).join(', ')}`

export const searchView = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.form(
    [h.OnSubmit(Message.SubmittedSearch()), h.Attribute('autocomplete', 'off'), h.Class('flex min-w-0 flex-1 items-center gap-1.5 xl:flex-none')],
    [
      h.input([
        h.Type('search'),
        h.AriaLabel('Go to a coordinate (sets the cue)'),
        h.Title(acceptedFormats),
        h.Spellcheck(false),
        h.Value(model.searchQuery),
        h.Placeholder('Go to 51.5074, -0.1278 · 30UXC9935'),
        h.OnInput(value => Message.UpdatedSearchQuery({ value })),
        h.Class(
          'min-w-0 flex-1 rounded-md border xl:w-64 xl:flex-none border-line bg-surface px-2.5 py-1 font-mono text-xs text-ink outline-none [@media(hover:none)]:text-base placeholder:text-faint focus:border-focus',
        ),
      ]),
      h.button(
        [h.Type('submit'), h.Class('shrink-0 rounded-md bg-accent px-2.5 py-1 text-xs font-semibold text-white hover:bg-accent/90')],
        ['Go'],
      ),
      searchStatusView(model.search, h),
    ],
  )

const searchStatusView = (search: SearchState, h: HtmlBuilder<Message>): Html =>
  h.span(
    [h.AriaLive('polite'), h.Class('max-w-24 truncate text-xs sm:max-w-48')],
    [
      SearchState.match(search, {
        Idle: () => h.empty,
        Found: ({ kind }) => h.span([h.Class('text-ok')], [`Read as ${kind}`]),
        Failed: ({ reason }) => h.span([h.Class('text-danger'), h.Title(reason)], [reason]),
      }),
    ],
  )
