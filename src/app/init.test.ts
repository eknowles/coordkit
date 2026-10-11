import { Option } from 'effect'
import { describe, expect, test } from 'vitest'

import * as Settings from '../submodels/settings'
import { init } from './init'
import { type Flags, MapState } from './model'

const flags: Flags = {
  maybeSavedSettings: Option.none(),
  maybeCueQuery: Option.none(),
  maybeCamera: Option.none(),
  layout: 'Wide',
  pointer: 'Hover',
}

describe('init', () => {
  test('starts loading the map with the default settings and no cue', () => {
    const { model } = init(flags)
    expect(model.mapState).toEqual(MapState.Loading())
    expect(model.settings.values).toEqual(Settings.defaultValues)
    expect(model.maybeCue).toEqual(Option.none())
  })

  test('reads the cue from the link in any accepted format', () => {
    const { model } = init({
      ...flags,
      maybeCueQuery: Option.some('30UXC9935'),
    })
    expect(Option.isSome(model.maybeCue)).toBe(true)
  })

  test('ignores a cue it cannot read', () => {
    const { model } = init({ ...flags, maybeCueQuery: Option.some('nowhere') })
    expect(model.maybeCue).toEqual(Option.none())
  })

  test('uses the saved settings and the camera from the link', () => {
    const camera = { center: { lat: 1, lon: 2 }, zoom: 3, bearing: 0, pitch: 0 }
    const saved: Settings.Values = {
      ...Settings.defaultValues,
      basemap: 'Light',
    }
    const { model } = init({
      ...flags,
      maybeSavedSettings: Option.some(saved),
      maybeCamera: Option.some(camera),
    })
    expect(model.settings.values.basemap).toBe('Light')
    expect(model.maybeCamera).toEqual(Option.some(camera))
  })
})
