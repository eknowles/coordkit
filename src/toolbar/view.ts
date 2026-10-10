import type { Html, HtmlBuilder } from 'foldkit/html'

import * as GoTo from '../goTo'
import { Message } from '../message'
import type { Model } from '../model'
import * as Settings from '../settings'
import * as Icon from '../ui/icon'

export const REPOSITORY_URL = 'https://github.com/eknowles/coordkit'

const githubLinkView = (h: HtmlBuilder<Message>): Html =>
  h.a(
    [
      h.Href(REPOSITORY_URL),
      h.Target('_blank'),
      h.Rel('noopener noreferrer'),
      h.AriaLabel('CoordKit source on GitHub (opens in a new tab)'),
      h.Title('Source on GitHub'),
      h.Class(
        'shrink-0 rounded-md p-1.5 text-muted outline-hidden hover:bg-ink/10 hover:text-ink focus-visible:ring-2 focus-visible:ring-focus 2xl:order-last',
      ),
    ],
    [Icon.github(h)],
  )

const toGoToMessage = (message: GoTo.Message): Message =>
  Message.GotGoToMessage({ message })

const toSettingsMessage = (message: Settings.Message): Message =>
  Message.GotSettingsMessage({ message })

/**
 * Wide screens: one row. Narrower screens: brand, search and the icon buttons on top, then the
 * overlay toggles in a strip that scrolls sideways. The two wrappers dissolve (`2xl:contents`) on
 * wide screens so every control joins the single row.
 */
export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.header(
    [
      h.Class(
        'flex shrink-0 flex-col gap-2 border-b border-line bg-panel px-3 py-2 2xl:flex-row 2xl:items-center 2xl:gap-x-3',
      ),
    ],
    [
      h.div(
        [h.Class('flex items-center gap-2 2xl:contents')],
        [
          h.h1(
            [h.Class('shrink-0'), h.Title('CoordKit')],
            [Icon.logo(h), h.span([h.Class('sr-only')], ['CoordKit'])],
          ),
          h.submodel({
            slotId: 'go-to',
            model: model.goTo,
            view: GoTo.view,
            toParentMessage: toGoToMessage,
          }),
          h.submodel({
            slotId: 'locate',
            model: model.goTo,
            view: GoTo.locateButtonView,
            toParentMessage: toGoToMessage,
          }),
          h.submodel({
            slotId: 'settings-menu',
            model: model.settings,
            view: Settings.menuView,
            toParentMessage: toSettingsMessage,
          }),
          githubLinkView(h),
        ],
      ),
      h.div(
        [
          h.Class(
            '-mx-3 flex items-center gap-3 overflow-x-auto px-3 [scrollbar-width:none] 2xl:contents [&::-webkit-scrollbar]:hidden',
          ),
        ],
        [
          h.submodel({
            slotId: 'overlay-toggles',
            model: model.settings,
            view: Settings.togglesView,
            toParentMessage: toSettingsMessage,
          }),
        ],
      ),
    ],
  )
