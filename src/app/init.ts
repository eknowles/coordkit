import { Option } from 'effect'
import type { Runtime } from 'foldkit'

import { LatLon } from '../core/domain'
import { parseCoordinate } from '../core/systems/registry'
import * as Copy from '../submodels/copy'
import * as GoTo from '../submodels/goTo'
import * as Settings from '../submodels/settings'
import type { Message } from './message'
import { CursorState, type Flags, MapState, type Model } from './model'

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
