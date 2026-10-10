import { Dom, Subscription } from 'foldkit'

import { Message } from './message'
import type { Model } from './model'
import { COMPACT_QUERY, HOVER_QUERY, toLayout, toPointer } from './viewport'

export const subscriptions = Subscription.make<Model, Message>()(_entry => ({
  layout: Subscription.persistentEntry(
    Dom.streamFromMediaQuery({
      query: COMPACT_QUERY,
      mapMatches: isCompact => Message.ChangedLayout({ layout: toLayout(isCompact) }),
    }),
  ),
  pointer: Subscription.persistentEntry(
    Dom.streamFromMediaQuery({
      query: HOVER_QUERY,
      mapMatches: canHover => Message.ChangedPointer({ pointer: toPointer(canHover) }),
    }),
  ),
}))
