import { Effect, Option, Schema } from 'effect'
import { KeyValueStore } from 'effect/persistence'

import { BrowserKeyValueStore } from '@effect/platform-browser'

import { Viewport } from '../core/domain'
import * as Settings from '../submodels/settings'
import type { Flags } from './model'
import { readCamera, readCueQuery } from './url'

/** Saved settings that are missing, unreadable or an older shape fall back to the defaults. */
const loadSettings = Effect.gen(function* () {
  // NOTE: KeyValueStore is marked unstable in Effect 4; Foldkit's examples use it for localStorage too.
  // @effect-diagnostics-next-line unstableApiUsage:off
  const store = yield* KeyValueStore.KeyValueStore
  const json = yield* Effect.fromOption(
    Option.fromNullishOr(yield* store.get(Settings.STORAGE_KEY)),
  )
  return yield* Schema.decodeEffect(Settings.ValuesJsonString)(json)
}).pipe(Effect.option, Effect.provide(BrowserKeyValueStore.layerLocalStorage))

const matches = (query: string) =>
  Effect.sync(() => window.matchMedia(query).matches)

const href = Effect.sync(() => window.location.href)

export const flags: Effect.Effect<Flags> = Effect.all({
  maybeSavedSettings: loadSettings,
  maybeCueQuery: Effect.map(href, readCueQuery),
  maybeCamera: Effect.map(href, readCamera),
  layout: Effect.map(matches(Viewport.COMPACT_QUERY), Viewport.toLayout),
  pointer: Effect.map(matches(Viewport.HOVER_QUERY), Viewport.toPointer),
})
