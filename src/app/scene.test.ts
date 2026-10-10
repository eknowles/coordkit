import { Option } from 'effect'
import { Command, Mount, click, expect, given, label, role, scene, text, type } from 'foldkit/scene'
import { modifyFields } from 'foldkit/struct'
import { describe, test } from 'vitest'

import { MoveCamera, RenderOverlay } from '../map/commands'
import { MountMap } from '../map/mount'
import { formatters, grids } from '../systems/registry'
import { CopyText, ReplaceCueInUrl, SaveSettings, WaitBeforeClearCopied } from './commands'
import { CursorState, MapState, SearchState, defaultSettings } from './domain'
import { update } from './main'
import { Message } from './message'
import type { Model } from './model'
import { view } from './view'

const london = { lat: 51.5073509, lon: -0.1277583 }

const readyModel: Model = {
  mapState: MapState.Ready({ hostId: 'map' }),
  maybeView: Option.some({ bounds: { west: -1, south: 51, east: 1, north: 52 }, zoom: 8 }),
  cursor: CursorState.Idle(),
  maybeCue: Option.some(london),
  settings: defaultSettings,
  searchQuery: '',
  search: SearchState.Idle(),
  maybeCopied: Option.none(),
  layout: 'Wide',
  pointer: 'Hover',
}

const acknowledgeMapMount = Mount.resolve(MountMap, Message.SucceededMountMap({ hostId: 'map' }))

describe('readout bar', () => {
  test('has a column for every registered formatter', () => {
    scene(
      { update, view },
      given(readyModel),
      acknowledgeMapMount,
      ...formatters.map(formatter => expect(text(formatter.label)).toExist()),
    )
  })

  test('shows the cue in each system and copies a value on click', () => {
    scene(
      { update, view },
      given(readyModel),
      acknowledgeMapMount,
      expect(role('button', { name: /30U XC/ })).toExist(),
      click(role('button', { name: /30U XC/ })),
      Command.expectHas(CopyText),
      Command.resolve(CopyText, Message.SucceededCopy({ systemId: 'MGRS', target: 'Cue' })),
      expect(text('Copied')).toExist(),
      Command.resolve(WaitBeforeClearCopied, Message.CompletedWaitBeforeClearCopied({ systemId: 'MGRS', target: 'Cue' })),
      expect(text('Copied')).toBeAbsent(),
    )
  })

  test('clearing the cue empties the cue row', () => {
    scene(
      { update, view },
      given(readyModel),
      acknowledgeMapMount,
      click(role('button', { name: 'Clear the cue' })),
      Command.resolveAll(
        [ReplaceCueInUrl, Message.CompletedReplaceCueInUrl()],
        [RenderOverlay, Message.CompletedRenderOverlay()],
      ),
      expect(role('button', { name: /30U XC/ })).toBeAbsent(),
    )
  })
})

describe('toolbar', () => {
  test('lists a toggle for every registered grid', () => {
    scene(
      { update, view },
      given(readyModel),
      acknowledgeMapMount,
      ...grids.map(grid => expect(role('button', { name: grid.label })).toExist()),
    )
  })

  test('toggling a grid saves the settings and redraws the overlay', () => {
    scene(
      { update, view },
      given(readyModel),
      acknowledgeMapMount,
      expect(role('button', { name: 'GARS' })).toHaveAttr('aria-pressed', 'false'),
      click(role('button', { name: 'GARS' })),
      Command.resolveAll(
        [SaveSettings, Message.CompletedSaveSettings()],
        [RenderOverlay, Message.CompletedRenderOverlay()],
      ),
      expect(role('button', { name: 'GARS' })).toHaveAttr('aria-pressed', 'true'),
    )
  })

  test('keeps ring spacing in the bar and the rest in the map settings menu', () => {
    scene(
      { update, view },
      given(readyModel),
      acknowledgeMapMount,
      expect(role('combobox', { name: 'Rings' })).toExist(),
      expect(role('button', { name: 'Map settings' })).toHaveAttr('popovertarget', 'map-settings'),
      ...['Base map', 'Projection', 'MGRS', 'GARS', 'Unit'].map(name => expect(role('combobox', { name })).toExist()),
    )
  })

  test('searching for a GARS cell reports the format and moves the camera', () => {
    scene(
      { update, view },
      given(readyModel),
      acknowledgeMapMount,
      type(label('Go to a coordinate (sets the cue)'), '361HN37'),
      click(role('button', { name: 'Go' })),
      expect(text('Read as GARS')).toExist(),
      Command.resolveAll(
        [ReplaceCueInUrl, Message.CompletedReplaceCueInUrl()],
        [MoveCamera, Message.CompletedMoveCamera()],
        [RenderOverlay, Message.CompletedRenderOverlay()],
      ),
    )
  })
})

describe('compact layout', () => {
  const compactTouchModel: Model = modifyFields(readyModel, { layout: () => 'Compact', pointer: () => 'Touch' })

  test('lists systems down the side and hides the cursor on touch screens', () => {
    scene(
      { update, view },
      given(compactTouchModel),
      acknowledgeMapMount,
      expect(role('columnheader', { name: 'System' })).toExist(),
      expect(role('columnheader', { name: /Cue/ })).toExist(),
      expect(role('columnheader', { name: /Cursor/ })).toBeAbsent(),
      ...formatters.map(formatter => expect(role('rowheader', { name: formatter.label })).toExist()),
      expect(role('button', { name: /30U XC/ })).toExist(),
    )
  })

  test('keeps the cursor column when the pointer can hover', () => {
    scene(
      { update, view },
      given(modifyFields(compactTouchModel, { pointer: () => 'Hover' })),
      acknowledgeMapMount,
      expect(role('columnheader', { name: /Cursor/ })).toExist(),
    )
  })
})

