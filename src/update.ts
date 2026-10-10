import { Option } from 'effect'
import { Update } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

import { ReplaceUrl } from './command'
import * as Copy from './copy'
import { type Box, type Camera, CameraRequest, LatLon } from './domain'
import * as GoTo from './goTo'
import { Message } from './message'
import { CursorState, MapState, type Model } from './model'
import * as Settings from './settings'

type UpdateReturn = Update.Return<Model, Message>
type Step = Update.Step<Model, Message>

// STEPS

const setCue =
  (maybePoint: Option.Option<LatLon.LatLon>): Step =>
  model => ({
    model: modifyFields(model, {
      maybeCue: () => Option.map(maybePoint, LatLon.clampToWorld),
    }),
  })

const setCamera =
  (camera: Camera.Camera): Step =>
  model => ({
    model: modifyFields(model, { maybeCamera: () => Option.some(camera) }),
  })

/** Ask the map for one animated move. Each request gets the next id, so the map can tell it is new. */
const requestCamera =
  (target: CameraRequest.CameraTarget): Step =>
  model => ({
    model: modifyFields(model, {
      maybeCameraRequest: maybeRequest =>
        Option.some({
          id: Option.match(maybeRequest, {
            onNone: () => 0,
            onSome: ({ id }) => id + 1,
          }),
          target,
        }),
    }),
  })

/** Write the cue and camera as the Model has them now, so this runs after the Steps that change them. */
const replaceUrl: Step = model => ({
  model,
  commands: [
    ReplaceUrl({ maybeCue: model.maybeCue, maybeCamera: model.maybeCamera }),
  ],
})

const clearGoToStatus: Step = Update.foldChildStep({
  update: GoTo.clearStatus,
  read: (model: Model) => Option.some(model.goTo),
  write: (model, nextGoTo) => modifyFields(model, { goTo: () => nextGoTo }),
  toParentMessage: message => Message.GotGoToMessage({ message }),
})

const cameraTarget = (
  point: LatLon.LatLon,
  maybeBox: Option.Option<Box.Box>,
): CameraRequest.CameraTarget =>
  Option.match(maybeBox, {
    onNone: () => CameraRequest.CameraTarget.FlyTo({ point }),
    onSome: box => CameraRequest.CameraTarget.FitBox({ box }),
  })

// FOLDS

const foldSettings = Update.foldChild({
  update: Settings.update,
  read: (model: Model) => Option.some(model.settings),
  write: (model, nextSettings) =>
    modifyFields(model, { settings: () => nextSettings }),
  toParentMessage: message => Message.GotSettingsMessage({ message }),
})

const foldGoToOutMessage = GoTo.OutMessage.match<Step>({
  ChoseLocation: ({ point, maybeBox }) =>
    Update.combine([
      setCue(Option.some(point)),
      requestCamera(cameraTarget(point, maybeBox)),
      replaceUrl,
    ]),
})

const foldGoTo = Update.foldChild({
  update: GoTo.update,
  read: (model: Model) => Option.some(model.goTo),
  write: (model, nextGoTo) => modifyFields(model, { goTo: () => nextGoTo }),
  toParentMessage: message => Message.GotGoToMessage({ message }),
  foldOutMessage: foldGoToOutMessage,
})

const foldCopy = Update.foldChild({
  update: Copy.update,
  read: (model: Model) => Option.some(model.copy),
  write: (model, nextCopy) => modifyFields(model, { copy: () => nextCopy }),
  toParentMessage: message => Message.GotCopyMessage({ message }),
})

// UPDATE

export const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    LoadedMap: () => ({
      model: modifyFields(model, { mapState: () => MapState.Ready() }),
    }),

    FailedLoadMap: ({ reason }) => ({
      model: modifyFields(model, {
        mapState: () => MapState.Failed({ reason }),
      }),
    }),

    MovedMap: ({ camera }) =>
      Update.combine(model, [setCamera(camera), replaceUrl]),

    MovedCursor: ({ point }) => ({
      model: modifyFields(model, {
        cursor: () => CursorState.OnMap({ point: LatLon.clampToWorld(point) }),
      }),
    }),

    LeftMap: () => ({
      model: modifyFields(model, {
        cursor: cursor =>
          CursorState.match(cursor, {
            Idle: () => cursor,
            OnMap: ({ point }) => CursorState.OffMap({ point }),
            OffMap: () => cursor,
          }),
      }),
    }),

    ClickedMap: ({ point }) =>
      Update.combine(model, [
        setCue(Option.some(point)),
        clearGoToStatus,
        replaceUrl,
      ]),

    ClickedClearCue: () =>
      Update.combine(model, [
        setCue(Option.none()),
        clearGoToStatus,
        replaceUrl,
      ]),

    UpdatedLayout: ({ layout }) => ({
      model: modifyFields(model, { layout: () => layout }),
    }),

    UpdatedPointer: ({ pointer }) => ({
      model: modifyFields(model, { pointer: () => pointer }),
    }),

    SucceededReplaceUrl: () => ({ model }),

    // NOTE: a URL that cannot be replaced only loses the shareable link; the app carries on.
    FailedReplaceUrl: () => ({ model }),

    GotSettingsMessage: ({ message }) => foldSettings(model, message),

    GotGoToMessage: ({ message }) => foldGoTo(model, message),

    GotCopyMessage: ({ message }) => foldCopy(model, message),
  })
