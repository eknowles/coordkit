import { describe, expect, test } from 'vitest'

import {
  type ProfileId,
  formattersFor,
  gridDrawOrderFor,
  gridSwitchesFor,
  gridTogglesFor,
  profiles,
} from './profiles'
import { defaultGridToggles, formatters, grids } from './registry'

const profileIds: ReadonlyArray<ProfileId> = ['Land', 'Maritime', 'Air']
const formatterIds = formatters.map(({ id }) => id)
const gridIds = grids.map(({ id }) => id)
const idsOf = (items: ReadonlyArray<{ id: string }>) =>
  items.map(({ id }) => id)

describe('profiles', () => {
  test.each(profileIds)('%s names only registered systems', profileId => {
    const profile = profiles[profileId]
    expect(formatterIds).toEqual(
      expect.arrayContaining([...profile.leadingFormatterIds]),
    )
    expect(gridIds).toEqual(expect.arrayContaining([...profile.leadingGridIds]))
    expect(gridIds).toEqual(expect.arrayContaining([...profile.enabledGridIds]))
  })

  test.each(profileIds)(
    '%s keeps every column and switch exactly once',
    profileId => {
      expect([...idsOf(formattersFor(profileId))].sort()).toEqual(
        [...formatterIds].sort(),
      )
      expect([...idsOf(gridSwitchesFor(profileId))].sort()).toEqual(
        [...gridIds].sort(),
      )
      expect([...idsOf(gridDrawOrderFor(profileId))].sort()).toEqual(
        [...gridIds].sort(),
      )
    },
  )

  test('Land matches the first-visit grid defaults', () => {
    expect(gridTogglesFor('Land')).toEqual(defaultGridToggles())
  })

  test('Maritime puts degrees and minutes, then GARS, first', () => {
    expect(idsOf(formattersFor('Maritime')).slice(0, 3)).toEqual([
      'DDM',
      'GARS',
      'MGRS',
    ])
    expect(idsOf(gridSwitchesFor('Maritime')).slice(0, 3)).toEqual([
      'Ddm',
      'Gars',
      'MgrsTicks',
    ])
  })

  test('Maritime turns on the chart grid and MGRS ticks, not MGRS lines', () => {
    const toggles = gridTogglesFor('Maritime')
    expect(toggles['Ddm']).toBe(true)
    expect(toggles['MgrsTicks']).toBe(true)
    expect(toggles['Mgrs']).toBe(false)
  })

  test("draws the profile's grids on top, its first grid highest", () => {
    const order = idsOf(gridDrawOrderFor('Maritime'))
    expect(order.slice(-3)).toEqual(['MgrsTicks', 'Gars', 'Ddm'])
  })

  test('keeps registry order for the grids a profile does not lead with', () => {
    const others = idsOf(gridDrawOrderFor('Air')).filter(
      id => !profiles.Air.leadingGridIds.includes(id),
    )
    expect(others).toEqual(
      gridIds.filter(id => !profiles.Air.leadingGridIds.includes(id)),
    )
  })
})
