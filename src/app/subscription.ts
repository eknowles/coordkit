import { Dom, Subscription } from 'foldkit'

import { Viewport } from '../core/domain'
import { Message } from './message'
import type { Model } from './model'

export const subscriptions = Subscription.make<Model, Message>()(_entry => ({
  layout: Subscription.persistentEntry(
    Dom.streamFromMediaQuery({
      query: Viewport.COMPACT_QUERY,
      mapMatches: isCompact =>
        Message.UpdatedLayout({ layout: Viewport.toLayout(isCompact) }),
    }),
  ),
  pointer: Subscription.persistentEntry(
    Dom.streamFromMediaQuery({
      query: Viewport.HOVER_QUERY,
      mapMatches: canHover =>
        Message.UpdatedPointer({ pointer: Viewport.toPointer(canHover) }),
    }),
  ),
}))
