import type { Html, HtmlBuilder } from 'foldkit/html'

import type { Message } from '../app/message'
import type { Model } from '../app/model'
import { githubIconView, settingsIconView } from '../ui/icons'
import { gridTogglesView } from './grids'
import { mapSettingsView, ringSpacingView } from './options'
import { searchView } from './search'

export const REPOSITORY_URL = 'https://github.com/eknowles/coordkit'
const SETTINGS_POPOVER_ID = 'map-settings'

const iconButtonClass = 'shrink-0 rounded-md p-1.5 text-muted hover:bg-ink/10 hover:text-ink xl:order-last'

const dividerView = (h: HtmlBuilder<Message>): Html => h.span([h.Class('h-5 w-px shrink-0 bg-line'), h.AriaHidden(true)])

const githubLinkView = (h: HtmlBuilder<Message>): Html =>
  h.a(
    [
      h.Href(REPOSITORY_URL),
      h.Target('_blank'),
      h.Rel('noopener noreferrer'),
      h.AriaLabel('CoordKit source on GitHub'),
      h.Title('Source on GitHub'),
      h.Class(iconButtonClass),
    ],
    [githubIconView(h)],
  )

/** The browser's own popover: it opens from the button, and closes on Escape or a click outside. */
const settingsButtonView = (h: HtmlBuilder<Message>): Html =>
  h.button(
    [
      h.Type('button'),
      h.Popovertarget(SETTINGS_POPOVER_ID),
      h.AriaLabel('Map settings'),
      h.Title('Map settings'),
      h.Class(`${iconButtonClass} ml-auto`),
    ],
    [settingsIconView(h)],
  )

const settingsPopoverView = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.div(
    [
      h.Id(SETTINGS_POPOVER_ID),
      h.Popover('auto'),
      h.AriaLabel('Map settings'),
      h.Class('ck-popover w-64 rounded-lg border border-line bg-panel p-3 text-ink shadow-lg shadow-black/40'),
    ],
    [mapSettingsView(model.settings, h)],
  )

/**
 * Wide screens: one row. Narrower screens: brand, search and the icon buttons on top, then the
 * grid toggles in a strip that scrolls sideways. The two wrappers dissolve (`xl:contents`) on
 * wide screens so every control joins the single row.
 */
export const toolbarView = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.header(
    [
      h.Class(
        'flex shrink-0 flex-col gap-2 border-b border-line bg-panel px-3 py-2 xl:flex-row xl:items-center xl:gap-x-3',
      ),
    ],
    [
      h.div(
        [h.Class('flex items-center gap-2 xl:contents')],
        [
          h.h1([h.Class('shrink-0 text-sm font-semibold')], ['CoordKit']),
          searchView(model, h),
          settingsButtonView(h),
          githubLinkView(h),
        ],
      ),
      h.div(
        [
          h.Class(
            '-mx-3 flex items-center gap-3 overflow-x-auto px-3 [scrollbar-width:none] xl:contents [&::-webkit-scrollbar]:hidden',
          ),
        ],
        [gridTogglesView(model.settings, h), dividerView(h), ringSpacingView(model.settings, h)],
      ),
      settingsPopoverView(model, h),
    ],
  )
