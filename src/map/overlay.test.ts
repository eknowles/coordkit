import { Option } from 'effect'
import { modifyFields } from 'foldkit/struct'
import { describe, expect, test } from 'vitest'

import { mgrsGridDefinition } from '../systems/mgrs'
import { buildOverlayFrame, type OverlayInput } from './overlay'

const input: OverlayInput = {
  gridToggles: { Gzd: false, Mgrs: true, Gars: false, Graticule: false },
  showLabels: true,
  view: { bounds: { west: -1, south: 51, east: 1, north: 52 }, zoom: 6 },
  maybeCue: Option.none(),
  options: { mgrsPrecision: 5, garsPrecision: 5 },
  showRings: false,
  ringSpacing: 'Auto',
  ringUnit: 'NauticalMiles',
  basemap: 'Dark',
}

const firstLabel = (frame: ReturnType<typeof buildOverlayFrame>) => frame.labels.features[0]!.properties!

describe('buildOverlayFrame', () => {
  test('uses the on-dark colours and a dark halo on the Dark base map', () => {
    const label = firstLabel(buildOverlayFrame(input))
    expect(label['color']).toBe(`rgb(${mgrsGridDefinition.colors.onDark.slice(0, 3).join(',')})`)
    expect(label['halo']).toMatch(/^rgba\(17, 17, 19/)
  })

  test('switches to the on-light colours and a white halo on the Light base map', () => {
    const label = firstLabel(buildOverlayFrame(modifyFields(input, { basemap: () => 'Light' })))
    expect(label['color']).toBe(`rgb(${mgrsGridDefinition.colors.onLight.slice(0, 3).join(',')})`)
    expect(label['halo']).toMatch(/^rgba\(255, 255, 255/)
  })

  test('draws no rings when rings are off', () => {
    const frame = buildOverlayFrame(modifyFields(input, { maybeCue: () => Option.some({ lat: 51.5, lon: 0 }) }))
    expect(frame.layers.map(layer => layer.id)).not.toContain('range-rings')
  })

  test('draws ring labels around the cue even with grid labels off', () => {
    const frame = buildOverlayFrame(
      modifyFields(input, {
        showLabels: () => false,
        maybeCue: () => Option.some({ lat: 51.5, lon: 0 }),
        showRings: () => true,
        ringSpacing: () => '1',
      }),
    )
    expect(frame.labels.features.map(f => f.properties!['text'])).toEqual(['1 NM', '2 NM', '3 NM', '4 NM', '5 NM', '6 NM'])
  })
})
