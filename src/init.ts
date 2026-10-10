import { Option } from 'effect'
import type { Runtime } from 'foldkit'

import * as Copy from './copy'
import { LatLon } from './domain'
import * as GoTo from './goTo'
import type { Message } from './message'
import { CursorState, type Flags, MapState, type Model } from './model'
import * as Settings from './settings'
import { parseCoordinate } from './systems/registry'

// INIT

/** A cue in the link (`?p=`) takes any format the search box accepts. */
const cueFromQuery = (
  maybeQuery: Option.Option<string>,
): Option.Option<LatLon.LatLon> =>
  Option.map(Option.flatMap(maybeQuery, parseCoordinate), ({ point }) =>
    LatLon.clampToWorld(point),
  )

export const init: Runtime.ApplicationInit<Model, Message, Flags> = flags => ({
  model: {
    mapState: MapState.Loading(),
    maybeCamera: flags.maybeCamera,
    maybeCameraRequest: Option.none(),
    cursor: CursorState.Idle(),
    maybeCue: cueFromQuery(flags.maybeCueQuery),
    settings: Settings.init(flags.maybeSavedSettings),
    goTo: GoTo.init(),
    copy: Copy.init(),
    layout: flags.layout,
    pointer: flags.pointer,
  },
})
