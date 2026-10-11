import { Boolean, Effect, Option, Schema } from 'effect'
import { KeyValueStore } from 'effect/persistence'
import { Command, Update } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

import { BrowserKeyValueStore } from '@effect/platform-browser'
import { Popover, RadioGroup } from '@foldkit/ui'

import { GridToggles, MapStyle } from '../../core/domain'
import { type ProfileId, gridTogglesFor } from '../../core/systems/profiles'
import { Message } from './message'
import { type Model, STORAGE_KEY, Values, ValuesJsonString } from './model'
import {
  BasemapRadioGroup,
  ProfileRadioGroup,
  ProjectionRadioGroup,
} from './radioGroup'

type UpdateReturn = Update.Return<Model, Message>

/** Apply a change to the saved values and save them. */
const updateValues = (
  model: Model,
  toNextValues: (values: Values) => Values,
): UpdateReturn => {
  const nextModel = modifyFields(model, { values: toNextValues })
  return {
    model: nextModel,
    commands: [SaveSettings({ values: nextModel.values })],
  }
}

type Step = Update.Step<Model, Message>

const foldMenuOutMessage = Popover.OutMessage.match<Step>({
  Opened: () => stepModel => ({ model: stepModel }),
  Closed: () => stepModel => ({ model: stepModel }),
})

const foldMenu = Update.foldChild({
  update: Popover.update,
  read: (model: Model) => Option.some(model.menu),
  write: (model, nextMenu) => modifyFields(model, { menu: () => nextMenu }),
  toParentMessage: message => Message.GotMenuMessage({ message }),
  foldOutMessage: foldMenuOutMessage,
})

/** Choosing a profile also sets every grid toggle to that profile's grids. */
const foldProfileRadioGroupOutMessage = RadioGroup.OutMessage.match<
  Step,
  RadioGroup.OutMessage<ProfileId>
>({
  Selected:
    ({ value }) =>
    stepModel =>
      updateValues(
        stepModel,
        modifyFields({
          profile: () => value,
          grids: () => gridTogglesFor(value),
        }),
      ),
})

const foldProfileRadioGroup = Update.foldChild({
  update: ProfileRadioGroup.update,
  read: (model: Model) => Option.some(model.profileRadioGroup),
  write: (model, nextProfileRadioGroup) =>
    modifyFields(model, { profileRadioGroup: () => nextProfileRadioGroup }),
  toParentMessage: message => Message.GotProfileRadioGroupMessage({ message }),
  foldOutMessage: foldProfileRadioGroupOutMessage,
})

const foldBasemapRadioGroupOutMessage = RadioGroup.OutMessage.match<
  Step,
  RadioGroup.OutMessage<MapStyle.Basemap>
>({
  Selected:
    ({ value }) =>
    stepModel =>
      updateValues(stepModel, modifyFields({ basemap: () => value })),
})

const foldBasemapRadioGroup = Update.foldChild({
  update: BasemapRadioGroup.update,
  read: (model: Model) => Option.some(model.basemapRadioGroup),
  write: (model, nextBasemapRadioGroup) =>
    modifyFields(model, { basemapRadioGroup: () => nextBasemapRadioGroup }),
  toParentMessage: message => Message.GotBasemapRadioGroupMessage({ message }),
  foldOutMessage: foldBasemapRadioGroupOutMessage,
})

const foldProjectionRadioGroupOutMessage = RadioGroup.OutMessage.match<
  Step,
  RadioGroup.OutMessage<MapStyle.Projection>
>({
  Selected:
    ({ value }) =>
    stepModel =>
      updateValues(stepModel, modifyFields({ projection: () => value })),
})

const foldProjectionRadioGroup = Update.foldChild({
  update: ProjectionRadioGroup.update,
  read: (model: Model) => Option.some(model.projectionRadioGroup),
  write: (model, nextProjectionRadioGroup) =>
    modifyFields(model, {
      projectionRadioGroup: () => nextProjectionRadioGroup,
    }),
  toParentMessage: message =>
    Message.GotProjectionRadioGroupMessage({ message }),
  foldOutMessage: foldProjectionRadioGroupOutMessage,
})

// UPDATE

export const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    ToggledGrid: ({ gridId }) =>
      updateValues(model, modifyFields({ grids: GridToggles.toggle(gridId) })),

    ToggledGridLabels: () =>
      updateValues(model, modifyFields({ isGridLabelsVisible: Boolean.not })),

    ToggledRangeRings: () =>
      updateValues(model, modifyFields({ isRangeRingsVisible: Boolean.not })),

    SelectedMgrsPrecision: ({ precision }) =>
      updateValues(model, modifyFields({ mgrsPrecision: () => precision })),

    SelectedGarsPrecision: ({ precision }) =>
      updateValues(model, modifyFields({ garsPrecision: () => precision })),

    SelectedTileZoom: ({ zoom }) =>
      updateValues(model, modifyFields({ tileZoom: () => zoom })),

    SelectedRingSpacing: ({ spacing }) =>
      updateValues(model, modifyFields({ ringSpacing: () => spacing })),

    SelectedRingUnit: ({ unit }) =>
      updateValues(model, modifyFields({ ringUnit: () => unit })),

    GotMenuMessage: ({ message }) => foldMenu(model, message),

    GotProfileRadioGroupMessage: ({ message }) =>
      foldProfileRadioGroup(model, message),

    GotBasemapRadioGroupMessage: ({ message }) =>
      foldBasemapRadioGroup(model, message),

    GotProjectionRadioGroupMessage: ({ message }) =>
      foldProjectionRadioGroup(model, message),

    SucceededSaveSettings: () => ({ model }),

    // NOTE: a failed save only loses persistence; the settings still apply for this visit.
    FailedSaveSettings: () => ({ model }),
  })

// COMMAND

export const SaveSettings = Command.define('SaveSettings', {
  args: { values: Values },
  messages: [Message.SucceededSaveSettings, Message.FailedSaveSettings],
  execute: ({ values }) =>
    Effect.gen(function* () {
      // NOTE: KeyValueStore is marked unstable in Effect 4; Foldkit's examples use it for localStorage too.
      // @effect-diagnostics-next-line unstableApiUsage:off
      const store = yield* KeyValueStore.KeyValueStore
      const encoded = yield* Schema.encodeEffect(ValuesJsonString)(values)
      yield* store.set(STORAGE_KEY, encoded)
      return Message.SucceededSaveSettings()
    }).pipe(
      Effect.provide(BrowserKeyValueStore.layerLocalStorage),
      Effect.catch(() => Effect.succeed(Message.FailedSaveSettings())),
    ),
})
