import { Schema } from 'effect'

import { CopiedCell, CursorState, LatLon, Layout, MapState, MapView, Pointer, SearchState, Settings } from './domain'

export const Model = Schema.Struct({
  mapState: MapState,
  maybeView: Schema.Option(MapView),
  cursor: CursorState,
  maybeCue: Schema.Option(LatLon),
  settings: Settings,
  searchQuery: Schema.String,
  search: SearchState,
  maybeCopied: Schema.Option(CopiedCell),
  layout: Layout,
  pointer: Pointer,
})
export type Model = typeof Model.Type

export const Flags = Schema.Struct({
  maybeSettings: Schema.Option(Settings),
  maybeCueQuery: Schema.Option(Schema.String),
  layout: Layout,
  pointer: Pointer,
})
export type Flags = typeof Flags.Type
