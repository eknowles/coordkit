import { Option } from 'effect'

import { Camera, type LatLon } from './domain'

/** The cue goes in the query, as `?p=lat,lon`, so a shared link opens with the same cue. */
export const CUE_PARAM = 'p'

/** The camera goes in the hash, as `#view=zoom/lat/lon/bearing/pitch`, the same form as MapLibre's own hash. */
export const CAMERA_HASH_KEY = 'view'

const CUE_DECIMALS = 7

export const cueToUrlValue = ({ lat, lon }: LatLon.LatLon): string =>
  `${lat.toFixed(CUE_DECIMALS)},${lon.toFixed(CUE_DECIMALS)}`

/** The URL with the cue and the camera written in; a missing cue removes the parameter. */
export const withState = (
  href: string,
  maybeCue: Option.Option<LatLon.LatLon>,
  maybeCamera: Option.Option<Camera.Camera>,
): URL => {
  const url = new URL(href)
  Option.match(maybeCue, {
    onNone: () => url.searchParams.delete(CUE_PARAM),
    onSome: cue => url.searchParams.set(CUE_PARAM, cueToUrlValue(cue)),
  })
  if (Option.isSome(maybeCamera)) {
    url.hash = `${CAMERA_HASH_KEY}=${Camera.toUrlValue(maybeCamera.value)}`
  }
  return url
}

export const readCueQuery = (href: string): Option.Option<string> =>
  Option.fromNullishOr(new URL(href).searchParams.get(CUE_PARAM))

export const readCamera = (href: string): Option.Option<Camera.Camera> =>
  Option.flatMap(
    Option.fromNullishOr(
      new URLSearchParams(new URL(href).hash.slice(1)).get(CAMERA_HASH_KEY),
    ),
    Camera.fromUrlValue,
  )
