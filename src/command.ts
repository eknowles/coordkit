import { Effect, Schema } from 'effect'
import { Command } from 'foldkit'

import { Camera, LatLon } from './domain'
import { Message } from './message'
import { withState } from './url'

/** Keep the cue and camera in the URL without adding history entries, so the link can be shared. */
export const ReplaceUrl = Command.define('ReplaceUrl', {
  args: {
    maybeCue: Schema.Option(LatLon.LatLon),
    maybeCamera: Schema.Option(Camera.Camera),
  },
  messages: [Message.SucceededReplaceUrl, Message.FailedReplaceUrl],
  execute: ({ maybeCue, maybeCamera }) =>
    Effect.try(() => {
      const url = withState(window.location.href, maybeCue, maybeCamera)
      window.history.replaceState(window.history.state, '', url)
    }).pipe(
      Effect.as(Message.SucceededReplaceUrl()),
      Effect.catch(() => Effect.succeed(Message.FailedReplaceUrl())),
    ),
})
