import { Option } from 'effect'
import {
  Command,
  CustomElement,
  change,
  click,
  expect,
  given,
  label,
  role,
  scene,
  text,
  type,
} from 'foldkit/scene'
import { modifyFields } from 'foldkit/struct'
import { describe, test } from 'vitest'

import { RadioGroup } from '@foldkit/ui'

import { formatters, grids } from '../core/systems/registry'
import { coordkitMap } from '../map'
import * as Copy from '../submodels/copy'
import * as GoTo from '../submodels/goTo'
import * as Settings from '../submodels/settings'
import { london, newYork, readyModel } from '../test/fixture'
import { ReplaceUrl } from './command'
import { Message } from './message'
import { MapState, type Model } from './model'
import { update } from './update'
import { view } from './view'

const app = { update, view }

const cueModel: Model = modifyFields(readyModel, {
  maybeCue: () => Option.some(london),
})

const cueMgrsCell = role('button', { name: /^Cue MGRS: 30U XC/ })

const resolveReplaceUrl = Command.resolve(
  ReplaceUrl,
  Message.SucceededReplaceUrl(),
)

const resolveSave = Command.resolve(
  Settings.SaveSettings,
  Settings.Message.SucceededSaveSettings(),
)

describe('map', () => {
  test('a click on the map sets the cue', () => {
    scene(
      app,
      given(readyModel),
      expect(role('region', { name: /^Map\. Click to set the cue/ })).toExist(),
      CustomElement.emit(coordkitMap, 'coordkit-map', 'map-clicked', london),
      resolveReplaceUrl,
      expect(cueMgrsCell).toExist(),
    )
  })

  test('the cursor row follows the pointer over the map', () => {
    scene(
      app,
      given(readyModel),
      CustomElement.emit(coordkitMap, 'coordkit-map', 'cursor-moved', newYork),
      expect(role('button', { name: /^Cursor MGRS: 18T WL/ })).toExist(),
      CustomElement.emit(coordkitMap, 'coordkit-map', 'cursor-left', {}),
      expect(role('button', { name: /^Cursor MGRS: 18T WL/ })).toExist(),
    )
  })

  test('a map that cannot start shows why', () => {
    scene(
      app,
      given(modifyFields(readyModel, { mapState: () => MapState.Loading() })),
      CustomElement.emit(coordkitMap, 'coordkit-map', 'map-failed', {
        reason: 'WebGL is not supported',
      }),
      expect(role('alert')).toContainText('WebGL is not supported'),
    )
  })
})

describe('readout', () => {
  test('has a column for every registered formatter', () => {
    scene(
      app,
      given(cueModel),
      ...formatters.map(formatter => expect(text(formatter.label)).toExist()),
    )
  })

  test('copies a reading on click and says so', () => {
    scene(
      app,
      given(cueModel),
      click(cueMgrsCell),
      Command.resolve(
        Copy.CopyText,
        Copy.Message.SucceededCopyText({ cellId: 'Cue-MGRS', copyId: 1 }),
      ),
      expect(text('Copied')).toExist(),
      Command.resolve(
        Copy.WaitBeforeHidingCopyFeedback,
        Copy.Message.CompletedWaitBeforeHidingCopyFeedback({
          cellId: 'Cue-MGRS',
          copyId: 1,
        }),
      ),
      expect(text('Copied')).toBeAbsent(),
    )
  })

  test('says when the clipboard refuses a copy', () => {
    scene(
      app,
      given(cueModel),
      click(cueMgrsCell),
      Command.resolve(
        Copy.CopyText,
        Copy.Message.FailedCopyText({ cellId: 'Cue-MGRS', copyId: 1 }),
      ),
      expect(text('Copy failed')).toExist(),
      Command.resolve(
        Copy.WaitBeforeHidingCopyFeedback,
        Copy.Message.CompletedWaitBeforeHidingCopyFeedback({
          cellId: 'Cue-MGRS',
          copyId: 1,
        }),
      ),
    )
  })

  test('clearing the cue empties the cue row', () => {
    scene(
      app,
      given(cueModel),
      click(role('button', { name: 'Clear the cue' })),
      resolveReplaceUrl,
      expect(cueMgrsCell).toBeAbsent(),
    )
  })
})

describe('overlay toggles', () => {
  test('lists a switch for every registered grid, labels and rings', () => {
    scene(
      app,
      given(readyModel),
      ...grids.map(grid =>
        expect(role('switch', { name: grid.label })).toExist(),
      ),
      expect(role('switch', { name: 'Labels' })).toExist(),
      expect(role('switch', { name: 'Rings' })).toExist(),
    )
  })

  test('turning a grid on saves the settings', () => {
    scene(
      app,
      given(readyModel),
      expect(role('switch', { name: 'GARS' })).toHaveAttr(
        'aria-checked',
        'false',
      ),
      click(role('switch', { name: 'GARS' })),
      resolveSave,
      expect(role('switch', { name: 'GARS' })).toHaveAttr(
        'aria-checked',
        'true',
      ),
    )
  })
})

describe('settings panel', () => {
  test('wide screens show the profile, base map, projection, precision and ring options beside the map', () => {
    scene(
      app,
      given(readyModel),
      expect(role('complementary', { name: 'Map settings' })).toExist(),
      expect(role('button', { name: 'Map settings' })).toBeAbsent(),
      expect(role('radiogroup', { name: 'Profile' })).toExist(),
      expect(role('radiogroup', { name: 'Base map' })).toExist(),
      expect(role('radiogroup', { name: 'Projection' })).toExist(),
      expect(role('radio', { name: 'Satellite' })).toHaveAttr(
        'aria-checked',
        'true',
      ),
      ...[
        'MGRS precision',
        'GARS precision',
        'Map tile zoom',
        'Ring spacing',
        'Ring unit',
      ].map(name => expect(role('combobox', { name })).toExist()),
    )
  })

  test('compact screens show the settings as a strip that the toolbar button closes and opens', () => {
    const compactModel: Model = modifyFields(readyModel, {
      layout: () => 'Compact',
    })
    scene(
      app,
      given(compactModel),
      expect(role('complementary', { name: 'Map settings' })).toBeAbsent(),
      expect(role('button', { name: 'Map settings' })).toHaveAttr(
        'aria-expanded',
        'true',
      ),
      expect(role('radiogroup', { name: 'Profile' })).toExist(),
      click(role('button', { name: 'Map settings' })),
      resolveSave,
      expect(role('button', { name: 'Map settings' })).toHaveAttr(
        'aria-expanded',
        'false',
      ),
      click(role('button', { name: 'Map settings' })),
      resolveSave,
      expect(role('button', { name: 'Map settings' })).toHaveAttr(
        'aria-expanded',
        'true',
      ),
    )
  })

  test('choosing the Maritime profile turns on the chart grid and MGRS ticks', () => {
    scene(
      app,
      given(readyModel),
      click(role('radio', { name: 'Maritime' })),
      Command.resolveAll(
        [RadioGroup.FocusOption, RadioGroup.Message.CompletedFocusOption()],
        [Settings.SaveSettings, Settings.Message.SucceededSaveSettings()],
      ),
      ...(
        [
          ['DDM', 'true'],
          ['MGRS ticks', 'true'],
          ['MGRS', 'false'],
          ['UTM zones', 'false'],
        ] as const
      ).map(([name, isOn]) =>
        expect(role('switch', { name })).toHaveAttr('aria-checked', isOn),
      ),
    )
  })

  test('a select changes the MGRS precision shown in the readout', () => {
    scene(
      app,
      given(cueModel),
      change(label('MGRS precision'), '5'),
      resolveSave,
      expect(
        role('button', { name: /^Cue MGRS: 30U XC \d{5} \d{5}\./ }),
      ).toExist(),
    )
  })
})

describe('datum', () => {
  test('the readout names the WGS 84 datum once', () => {
    scene(app, given(cueModel), expect(text('WGS 84')).toExist())
  })
})

describe('go to', () => {
  test('searching for a GARS cell reports the format, warns that it is an area, and sets the cue', () => {
    scene(
      app,
      given(readyModel),
      type(label('Go to a coordinate (sets the cue)'), '361HN37'),
      click(role('button', { name: 'Go' })),
      resolveReplaceUrl,
      expect(text('GARS: an area, not a position')).toExist(),
      expect(role('button', { name: /^Cue GARS: 361HN/ })).toExist(),
    )
  })

  test('text that is not a coordinate marks the field invalid', () => {
    scene(
      app,
      given(readyModel),
      type(label('Go to a coordinate (sets the cue)'), 'nowhere'),
      click(role('button', { name: 'Go' })),
      expect(text('Could not recognise "nowhere"')).toExist(),
      expect(label('Go to a coordinate (sets the cue)')).toHaveAttr(
        'aria-invalid',
        'true',
      ),
    )
  })

  test('find my location sets the cue at the device position', () => {
    scene(
      app,
      given(readyModel),
      expect(role('heading', { name: 'CoordKit' })).toExist(),
      click(role('button', { name: 'Find my location' })),
      expect(text('Finding you…')).toExist(),
      Command.resolve(
        GoTo.GetCurrentPosition,
        GoTo.Message.SucceededGetCurrentPosition({
          requestId: 1,
          point: newYork,
        }),
      ),
      resolveReplaceUrl,
      expect(role('button', { name: /^Cue MGRS: 18T WL/ })).toExist(),
    )
  })

  test('reports why the location is unavailable', () => {
    scene(
      app,
      given(readyModel),
      click(role('button', { name: 'Find my location' })),
      Command.resolve(
        GoTo.GetCurrentPosition,
        GoTo.Message.FailedGetCurrentPosition({
          requestId: 1,
          reason: 'Location permission denied.',
        }),
      ),
      expect(text('Location permission denied.')).toExist(),
    )
  })
})

describe('compact layout', () => {
  const compactTouchModel: Model = modifyFields(cueModel, {
    layout: () => 'Compact',
    pointer: () => 'Touch',
  })

  test('shows a sheet of system cards for the cue, without the cursor on touch screens', () => {
    scene(
      app,
      given(compactTouchModel),
      expect(role('region', { name: 'Coordinate readout' })).toHaveAttr(
        'aria-hidden',
        'false',
      ),
      expect(role('list', { name: 'Coordinate systems' })).toExist(),
      expect(cueMgrsCell).toExist(),
      expect(text('Cursor')).toBeAbsent(),
      expect(role('table')).toBeAbsent(),
    )
  })

  test('the sheet slides away when the cue is cleared', () => {
    scene(
      app,
      given(compactTouchModel),
      click(role('button', { name: 'Clear the cue' })),
      resolveReplaceUrl,
      expect(cueMgrsCell).toBeAbsent(),
    )
  })

  test('includes the cursor on a narrow window with a mouse', () => {
    scene(
      app,
      given(modifyFields(compactTouchModel, { pointer: () => 'Hover' })),
      expect(text('Cursor')).toExist(),
    )
  })
})
