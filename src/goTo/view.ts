import clsx from 'clsx'
import { Array, pipe } from 'effect'
import { Submodel } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'

import { Button, Input } from '@foldkit/ui'

import { parsers } from '../systems/registry'
import * as Icon from '../ui/icon'
import { Message } from './message'
import { type Model, Status } from './model'

const SEARCH_INPUT_ID = 'coordinate-search'

const acceptedFormats = `Accepts ${pipe(
  parsers,
  Array.map(({ label }) => label),
  Array.join(', '),
)}.`

const statusTextView = (status: Status, h: HtmlBuilder<Message>): Html =>
  Status.match(status, {
    Idle: () => h.empty,
    Found: ({ kind }) => h.span([h.Class('text-ok')], [`Read as ${kind}`]),
    SearchFailed: ({ reason }) => h.span([h.Class('text-danger')], [reason]),
    Locating: () => h.span([h.Class('text-muted')], ['Finding you…']),
    LocateFailed: ({ reason }) => h.span([h.Class('text-danger')], [reason]),
  })

/** The search field and its status line; both search and "Find my location" report here. */
export const view = Submodel.defineView<Model, Message>((model, h) =>
  h.form(
    [
      h.OnSubmit(Message.SubmittedSearch()),
      h.Attribute('autocomplete', 'off'),
      h.Class('flex min-w-0 flex-1 items-center gap-1.5 2xl:flex-none'),
    ],
    [
      Input.view(
        {
          id: SEARCH_INPUT_ID,
          type: 'search',
          value: model.query,
          placeholder: 'Go to 51.5074, -0.1278 · 30UXC9935',
          onInput: value => Message.UpdatedQuery({ value }),
          isInvalid: Status.guards.SearchFailed(model.status),
          hasDescription: true,
          toView: attributes =>
            h.span(
              [h.Class('flex min-w-0 flex-1 2xl:w-64 2xl:flex-none')],
              [
                h.label(
                  [...attributes.label, h.Class('sr-only')],
                  ['Go to a coordinate (sets the cue)'],
                ),
                h.input([
                  ...attributes.input,
                  h.Spellcheck(false),
                  h.Class(
                    'min-w-0 flex-1 rounded-md border border-line bg-surface px-2.5 py-1 font-mono text-xs text-ink outline-hidden placeholder:text-faint focus-visible:ring-2 focus-visible:ring-focus aria-invalid:border-danger [@media(hover:none)]:text-base',
                  ),
                ]),
                h.span(
                  [...attributes.description, h.Class('sr-only')],
                  [acceptedFormats],
                ),
              ],
            ),
        },
        h,
      ),
      Button.view(
        {
          type: 'submit',
          toView: attributes =>
            h.button(
              [
                ...attributes.button,
                h.Class(
                  'shrink-0 rounded-md bg-accent px-2.5 py-1 text-xs font-semibold text-white outline-hidden hover:bg-accent/90 focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-panel',
                ),
              ],
              ['Go'],
            ),
        },
        h,
      ),
      h.span(
        [
          h.Role('status'),
          h.AriaLive('polite'),
          h.Class('min-w-0 max-w-24 truncate text-xs sm:max-w-48'),
        ],
        [statusTextView(model.status, h)],
      ),
    ],
  ),
)

/** The "Find my location" button, shown with the toolbar's other icon buttons. */
export const locateButtonView = Submodel.defineView<Model, Message>(
  (model, h) => {
    const isLocating = Status.guards.Locating(model.status)
    return Button.view(
      {
        onClick: Message.ClickedFindMyLocation(),
        toView: attributes =>
          h.button(
            [
              ...attributes.button,
              h.AriaLabel('Find my location'),
              h.Title('Find my location (sets the cue)'),
              h.Class(
                clsx(
                  'ml-auto shrink-0 rounded-md p-1.5 text-muted outline-hidden hover:bg-ink/10 hover:text-ink focus-visible:ring-2 focus-visible:ring-focus 2xl:order-last',
                  { 'animate-pulse text-cue': isLocating },
                ),
              ),
            ],
            [Icon.locate(h)],
          ),
      },
      h,
    )
  },
)
