import { Option } from 'effect'

import { CursorState, MapState, type Model } from '@/model'

import type { Camera } from '../core/domain'
import * as Copy from '../submodels/copy'
import * as GoTo from '../submodels/goTo'
import * as Settings from '../submodels/settings'

export const london = { lat: 51.5073509, lon: -0.1277583 }
export const newYork = { lat: 40.7128, lon: -74.006 }

export const londonCamera: Camera.Camera = {
  center: { lat: 51.5, lon: 0 },
  zoom: 8,
  bearing: 0,
  pitch: 0,
}

/** A wide screen with a mouse, the map loaded over London, the default settings and no cue. */
export const readyModel: Model = {
  mapState: MapState.Ready(),
  maybeCamera: Option.some(londonCamera),
  maybeCameraRequest: Option.none(),
  cursor: CursorState.Idle(),
  maybeCue: Option.none(),
  settings: Settings.init(Option.none()),
  goTo: GoTo.init(),
  copy: Copy.init(),
  layout: 'Wide',
  pointer: 'Hover',
}
