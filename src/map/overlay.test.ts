import { Option } from 'effect'
import { modifyFields } from 'foldkit/struct'
import { describe, expect, test } from 'vitest'

import * as Mgrs from '../systems/mgrs'
import { grids } from '../systems/registry'
import { type OverlayInput, buildOverlayFrame } from './overlay'

const input: OverlayInput = {
  gridToggles: { Gzd: false, Mgrs: true, Gars: false, Graticule: false },
  isGridLabelsVisible: true,
  bounds: [-1, 51, 1, 52],
  zoom: 6,
  maybeCue: Option.none(),
  options: { mgrsPrecision: 5, garsPrecision: 5, tileZoom: 12 },
  isRangeRingsVisible: false,
  ringSpacing: 'Auto',
  ringUnit: 'NauticalMiles',
  basemap: 'Dark',
}

const firstLabel = (frame: ReturnType<typeof buildOverlayFrame>) =>
  frame.labels.features[0]!.properties!

describe('buildOverlayFrame', () => {
  test('uses the on-dark colours and a dark halo on the Dark base map', () => {
    const label = firstLabel(buildOverlayFrame(input))
    expect(label['color']).toBe(
      `rgb(${Mgrs.grid.colors.onDark.slice(0, 3).join(',')})`,
    )
    expect(label['halo']).toMatch(/^rgba\(17, 17, 19/)
  })

  test('switches to the on-light colours and a white halo on the Light base map', () => {
    const label = firstLabel(
      buildOverlayFrame(modifyFields(input, { basemap: () => 'Light' })),
    )
    expect(label['color']).toBe(
      `rgb(${Mgrs.grid.colors.onLight.slice(0, 3).join(',')})`,
    )
    expect(label['halo']).toMatch(/^rgba\(255, 255, 255/)
  })

  test('draws no rings when rings are off', () => {
    const frame = buildOverlayFrame(
      modifyFields(input, {
        maybeCue: () => Option.some({ lat: 51.5, lon: 0 }),
      }),
    )
    expect(frame.layers.map(layer => layer.id)).not.toContain('range-rings')
  })

  test('draws ring labels around the cue even with grid labels off', () => {
    const frame = buildOverlayFrame(
      modifyFields(input, {
        isGridLabelsVisible: () => false,
        maybeCue: () => Option.some({ lat: 51.5, lon: 0 }),
        isRangeRingsVisible: () => true,
        ringSpacing: () => '1',
      }),
    )
    expect(frame.labels.features.map(f => f.properties!['text'])).toEqual([
      '1 NM',
      '2 NM',
      '3 NM',
      '4 NM',
      '5 NM',
      '6 NM',
    ])
  })

  test('outlines the cue cell only in the grids that are switched on', () => {
    const cueCellCount = (gridToggles: OverlayInput['gridToggles']) => {
      const frame = buildOverlayFrame(
        modifyFields(input, {
          gridToggles: () => gridToggles,
          maybeCue: () => Option.some({ lat: 51.5, lon: 0 }),
        }),
      )
      const data = frame.layers.find(layer => layer.id === 'cue-cells')?.props
        .data
      return Array.isArray(data) ? data.length : 0
    }
    const allOff = Object.fromEntries(grids.map(grid => [grid.id, false]))
    expect(cueCellCount(allOff)).toBe(0)
    expect(cueCellCount({ ...allOff, Gars: true })).toBe(1)
    expect(
      cueCellCount({ ...allOff, Gars: true, Georef: true, PlusCode: true }),
    ).toBe(3)
  })
})
