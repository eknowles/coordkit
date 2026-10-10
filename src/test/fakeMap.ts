import type { Map as MapInstance } from 'maplibre-gl'
import { vi } from 'vitest'

/** A stand-in for the MapLibre map that records the calls the label layer makes. */
export const makeFakeMap = () => {
  const sources = new Map<string, { setData: ReturnType<typeof vi.fn> }>()
  const fake = {
    addSource: vi.fn((id: string) => sources.set(id, { setData: vi.fn() })),
    addLayer: vi.fn(),
    getSource: vi.fn((id: string) => sources.get(id)),
  }
  // NOTE: the fake implements only the three methods labels.ts calls, so it cannot satisfy the
  // full MapLibre type without an assertion.
  // oxlint-disable-next-line typescript/consistent-type-assertions
  const map = fake as unknown as MapInstance
  return { fake, map, sources }
}
