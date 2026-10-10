import { Effect, Option, Schema } from 'effect'
import { KeyValueStore } from 'effect/persistence'

import { BrowserKeyValueStore } from '@effect/platform-browser'

import type { Flags } from './model'
import { CUE_URL_PARAM, SETTINGS_STORAGE_KEY, SettingsJsonString } from './persistence'
import { COMPACT_QUERY, HOVER_QUERY, toLayout, toPointer } from './viewport'

const loadSettings = Effect.gen(function* () {
  const store = yield* KeyValueStore.KeyValueStore
  const json = yield* Effect.fromOption(Option.fromNullishOr(yield* store.get(SETTINGS_STORAGE_KEY)))
  return yield* Schema.decodeEffect(SettingsJsonString)(json)
}).pipe(Effect.option, Effect.provide(BrowserKeyValueStore.layerLocalStorage))

const readCueQuery = Effect.sync(() =>
  Option.fromNullishOr(new URL(window.location.href).searchParams.get(CUE_URL_PARAM)),
)

const matches = (query: string) => Effect.sync(() => window.matchMedia(query).matches)

export const flags: Effect.Effect<Flags> = Effect.all({
  maybeSettings: loadSettings,
  maybeCueQuery: readCueQuery,
  layout: Effect.map(matches(COMPACT_QUERY), toLayout),
  pointer: Effect.map(matches(HOVER_QUERY), toPointer),
})
