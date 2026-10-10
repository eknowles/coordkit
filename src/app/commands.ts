import { Duration, Effect, Option, Schema } from 'effect'
import { KeyValueStore } from 'effect/persistence'
import { Command } from 'foldkit'

import { BrowserKeyValueStore } from '@effect/platform-browser'

import { LatLon, Settings, Target } from './domain'
import { Message } from './message'
import { CUE_URL_PARAM, SETTINGS_STORAGE_KEY, SettingsJsonString } from './persistence'

const COPIED_FEEDBACK = Duration.millis(1200)

export const CopyText = Command.define('CopyText', {
  args: { systemId: Schema.String, target: Target, text: Schema.String },
  messages: [Message.SucceededCopy, Message.FailedCopy],
  execute: ({ systemId, target, text }) =>
    Effect.tryPromise(() => navigator.clipboard.writeText(text)).pipe(
      Effect.as(Message.SucceededCopy({ systemId, target })),
      Effect.catch(error => Effect.succeed(Message.FailedCopy({ reason: String(error) }))),
    ),
})

export const WaitBeforeClearCopied = Command.define('WaitBeforeClearCopied', {
  args: { systemId: Schema.String, target: Target },
  messages: [Message.CompletedWaitBeforeClearCopied],
  execute: ({ systemId, target }) =>
    Effect.sleep(COPIED_FEEDBACK).pipe(Effect.as(Message.CompletedWaitBeforeClearCopied({ systemId, target }))),
})

export const SaveSettings = Command.define('SaveSettings', {
  args: { settings: Settings },
  messages: [Message.CompletedSaveSettings],
  execute: ({ settings }) =>
    Effect.gen(function* () {
      const store = yield* KeyValueStore.KeyValueStore
      const encoded = yield* Schema.encodeEffect(SettingsJsonString)(settings)
      yield* store.set(SETTINGS_STORAGE_KEY, encoded)
    }).pipe(
      Effect.provide(BrowserKeyValueStore.layerLocalStorage),
      Effect.ignore,
      Effect.as(Message.CompletedSaveSettings()),
    ),
})

export const ReplaceCueInUrl = Command.define('ReplaceCueInUrl', {
  args: { maybeCue: Schema.Option(LatLon) },
  messages: [Message.CompletedReplaceCueInUrl],
  execute: ({ maybeCue }) =>
    Effect.sync(() => {
      const url = new URL(window.location.href)
      Option.match(maybeCue, {
        onNone: () => url.searchParams.delete(CUE_URL_PARAM),
        onSome: ({ lat, lon }) => url.searchParams.set(CUE_URL_PARAM, `${lat.toFixed(7)},${lon.toFixed(7)}`),
      })
      window.history.replaceState(window.history.state, '', url)
    }).pipe(Effect.ignore, Effect.as(Message.CompletedReplaceCueInUrl())),
})
