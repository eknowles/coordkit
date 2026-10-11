import { Option } from 'effect'
import { describe, expect, test } from 'vitest'

import { readCamera, readCueQuery, withState } from './url'

const BASE = 'https://example.test/coordkit/'

const camera = {
  center: { lat: 51.5, lon: -0.12 },
  zoom: 9.5,
  bearing: 30,
  pitch: 45,
}

describe('URL state', () => {
  test('writes the cue to the query and the camera to the hash', () => {
    const url = withState(
      BASE,
      Option.some({ lat: 51.5073509, lon: -0.1277583 }),
      Option.some(camera),
    )
    expect(url.searchParams.get('p')).toBe('51.5073509,-0.1277583')
    expect(url.hash).toBe('#view=9.50/51.50000/-0.12000/30.0/45.0')
  })

  test('removes the cue parameter when there is no cue, and keeps the hash without a camera', () => {
    const url = withState(
      `${BASE}?p=1,2#view=1/2/3`,
      Option.none(),
      Option.none(),
    )
    expect(url.searchParams.has('p')).toBe(false)
    expect(url.hash).toBe('#view=1/2/3')
  })

  test('reads back what it writes', () => {
    const url = withState(
      BASE,
      Option.some({ lat: 1, lon: 2 }),
      Option.some(camera),
    )
    expect(readCueQuery(url.href)).toEqual(Option.some('1.0000000,2.0000000'))
    expect(readCamera(url.href)).toEqual(Option.some(camera))
  })

  test('reads a MapLibre hash without bearing and pitch', () => {
    expect(readCamera(`${BASE}#view=4/10/20`)).toEqual(
      Option.some({
        center: { lat: 10, lon: 20 },
        zoom: 4,
        bearing: 0,
        pitch: 0,
      }),
    )
  })

  test('clamps a camera from a link to what the map accepts', () => {
    expect(readCamera(`${BASE}#view=40/200/190/10/120`)).toEqual(
      Option.some({
        center: { lat: 90, lon: -170 },
        zoom: 24,
        bearing: 10,
        pitch: 85,
      }),
    )
  })

  test('ignores a missing or malformed camera', () => {
    expect(readCamera(`${BASE}#view=//`)).toEqual(Option.none())
    expect(readCamera(`${BASE}#view=4//20`)).toEqual(Option.none())
    expect(readCamera(BASE)).toEqual(Option.none())
    expect(readCamera(`${BASE}#view=4/ten/20`)).toEqual(Option.none())
    expect(readCamera(`${BASE}#view=4`)).toEqual(Option.none())
    expect(readCueQuery(BASE)).toEqual(Option.none())
  })
})
