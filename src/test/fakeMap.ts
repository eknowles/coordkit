import { vi } from 'vitest'

import type { MapHost } from '../map/host'

/** A stand-in for the MapLibre map and deck.gl overlay that records calls. */
export const makeFakeHost = () => {
  const sources = new Map<string, { setData: ReturnType<typeof vi.fn> }>()
  const map = {
    addSource: vi.fn((id: string) => sources.set(id, { setData: vi.fn() })),
    addLayer: vi.fn(),
    getSource: vi.fn((id: string) => sources.get(id)),
    setStyle: vi.fn(),
    setProjection: vi.fn(),
    flyTo: vi.fn(),
    fitBounds: vi.fn(),
    getZoom: vi.fn(() => 4),
    removeControl: vi.fn(),
    remove: vi.fn(),
  }
  const overlay = { setProps: vi.fn() }
  return { map, overlay, sources, host: { map, overlay } as unknown as MapHost }
}
