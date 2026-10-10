import { Option, Schema } from 'effect'
import { Command, given, message, model, story } from 'foldkit/story'
import { describe, expect, test } from 'vitest'

import { RadioGroup } from '@foldkit/ui'

import { Message } from './message'
import { ValuesJsonString, defaultValues, init } from './model'
import { SaveSettings, update } from './update'

const resolveSave = Command.resolve(
  SaveSettings,
  Message.SucceededSaveSettings(),
)

describe('settings', () => {
  test('toggling a grid, labels and rings saves each change', () => {
    story(
      update,
      given(init(Option.none())),
      message(Message.ToggledGrid({ gridId: 'Gars' })),
      resolveSave,
      message(Message.ToggledGridLabels()),
      resolveSave,
      message(Message.ToggledRangeRings()),
      resolveSave,
      model(({ values }) => {
        expect(values.grids['Gars']).toBe(true)
        expect(values.isGridLabelsVisible).toBe(false)
        expect(values.isRangeRingsVisible).toBe(false)
      }),
    )
  })

  test('an unknown grid id changes nothing but still saves', () => {
    story(
      update,
      given(init(Option.none())),
      message(Message.ToggledGrid({ gridId: 'Nope' })),
      model(({ values }) => expect(values.grids).not.toHaveProperty('Nope')),
      resolveSave,
    )
  })

  test('the selects set precision and ring options', () => {
    story(
      update,
      given(init(Option.none())),
      message(Message.SelectedMgrsPrecision({ precision: 5 })),
      resolveSave,
      message(Message.SelectedGarsPrecision({ precision: 5 })),
      resolveSave,
      message(Message.SelectedTileZoom({ zoom: 17 })),
      resolveSave,
      message(Message.SelectedRingSpacing({ spacing: '10' })),
      resolveSave,
      message(Message.SelectedRingUnit({ unit: 'Kilometres' })),
      resolveSave,
      model(({ values }) => {
        expect(values.mgrsPrecision).toBe(5)
        expect(values.garsPrecision).toBe(5)
        expect(values.tileZoom).toBe(17)
        expect(values.ringSpacing).toBe('10')
        expect(values.ringUnit).toBe('Kilometres')
      }),
    )
  })

  test('choosing a base map and projection in the radio groups saves them', () => {
    story(
      update,
      given(init(Option.none())),
      message(
        Message.GotBasemapRadioGroupMessage({
          message: RadioGroup.Message.SelectedOption({
            index: 0,
            value: 'Dark',
          }),
        }),
      ),
      Command.resolveAll(
        [RadioGroup.FocusOption, RadioGroup.Message.CompletedFocusOption()],
        [SaveSettings, Message.SucceededSaveSettings()],
      ),
      message(
        Message.GotProjectionRadioGroupMessage({
          message: RadioGroup.Message.SelectedOption({
            index: 0,
            value: 'Globe',
          }),
        }),
      ),
      Command.resolveAll(
        [RadioGroup.FocusOption, RadioGroup.Message.CompletedFocusOption()],
        [SaveSettings, Message.SucceededSaveSettings()],
      ),
      model(({ values }) => {
        expect(values.basemap).toBe('Dark')
        expect(values.projection).toBe('Globe')
      }),
    )
  })

  test('a failed save keeps the change for this visit', () => {
    story(
      update,
      given(init(Option.none())),
      message(Message.ToggledGridLabels()),
      Command.resolve(SaveSettings, Message.FailedSaveSettings()),
      model(({ values }) => expect(values.isGridLabelsVisible).toBe(false)),
    )
  })

  test('settings saved before the tile zoom existed load with the default tile zoom', () => {
    const { tileZoom: _tileZoom, ...olderValues } = defaultValues
    const decoded = Schema.decodeSync(ValuesJsonString)(
      JSON.stringify({ ...olderValues, garsPrecision: 15 }),
    )
    expect(decoded.tileZoom).toBe(12)
    expect(decoded.garsPrecision).toBe(15)
  })
})
