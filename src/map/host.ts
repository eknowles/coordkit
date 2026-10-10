import type { MapboxOverlay } from '@deck.gl/mapbox'
import { Option } from 'effect'
import type { Map as MapInstance } from 'maplibre-gl'

export type MapHost = Readonly<{ map: MapInstance; overlay: MapboxOverlay }>

const hostsById = new globalThis.Map<string, MapHost>()

/** Keep the live map and deck.gl overlay out of the Model, so Commands can reach them by id. */
export const setHost = (hostId: string, host: MapHost): void => {
  hostsById.set(hostId, host)
}

export const getHost = (hostId: string): Option.Option<MapHost> => Option.fromNullishOr(hostsById.get(hostId))

export const removeHost = (hostId: string, host: MapHost): void => {
  host.map.removeControl(host.overlay)
  host.map.remove()
  if (hostsById.get(hostId) === host) {
    hostsById.delete(hostId)
  }
}
