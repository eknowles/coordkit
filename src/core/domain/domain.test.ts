import { describe, expect, test } from 'vitest'

import { Camera, GridToggles, LatLon, Viewport } from './'

describe('Camera.isSameView', () => {
  const camera = { center: { lat: 1, lon: 2 }, zoom: 3, bearing: 0, pitch: 0 }

  test('treats rounding noise as the same view', () => {
    expect(
      Camera.isSameView(camera, {
        ...camera,
        zoom: 3.0001,
        center: { lat: 1 + 1e-9, lon: 2 },
      }),
    ).toBe(true)
  })

  test('sees a change in any part of the camera', () => {
    expect(Camera.isSameView(camera, { ...camera, zoom: 4 })).toBe(false)
    expect(Camera.isSameView(camera, { ...camera, bearing: 10 })).toBe(false)
    expect(Camera.isSameView(camera, { ...camera, pitch: 10 })).toBe(false)
    expect(
      Camera.isSameView(camera, { ...camera, center: { lat: 1, lon: 3 } }),
    ).toBe(false)
  })
})

describe('GridToggles.toggle', () => {
  test('flips a known grid from its default', () => {
    expect(GridToggles.toggle('Gars')({})).toEqual({ Gars: true })
    expect(GridToggles.toggle('Gars')({ Gars: true })).toEqual({ Gars: false })
  })

  test('leaves the toggles alone for an unknown grid', () => {
    const toggles = { Gars: true }
    expect(GridToggles.toggle('Nope')(toggles)).toBe(toggles)
  })
})

describe('LatLon.clampToWorld', () => {
  test('clamps the latitude and wraps the longitude', () => {
    expect(LatLon.clampToWorld({ lat: 95, lon: 190 })).toEqual({
      lat: 90,
      lon: -170,
    })
    expect(LatLon.clampToWorld({ lat: -95, lon: -190 })).toEqual({
      lat: -90,
      lon: 170,
    })
  })
})

describe('Viewport', () => {
  test('maps media query matches to the layout and pointer', () => {
    expect(Viewport.toLayout(true)).toBe('Compact')
    expect(Viewport.toLayout(false)).toBe('Wide')
    expect(Viewport.toPointer(true)).toBe('Hover')
    expect(Viewport.toPointer(false)).toBe('Touch')
  })
})
