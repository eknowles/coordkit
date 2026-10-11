import { HashMap, Option } from 'effect'
import { Command, given, message, model, story } from 'foldkit/story'
import { modifyFields } from 'foldkit/struct'
import { describe, expect, test } from 'vitest'

import * as CameraRequest from '../map/cameraRequest'
import * as Copy from '../submodels/copy'
import * as GoTo from '../submodels/goTo'
import * as Settings from '../submodels/settings'
import { london, londonCamera, newYork, readyModel } from '../test/fixture'
import { ReplaceUrl } from './command'
import { Message } from './message'
import { CursorState, MapState } from './model'
import { update } from './update'

const resolveReplaceUrl = Command.resolve(
  ReplaceUrl,
  Message.SucceededReplaceUrl(),
)

const gotGoTo = (message: GoTo.Message) => Message.GotGoToMessage({ message })

describe('map lifecycle', () => {
  const loadingModel = modifyFields(readyModel, {
    mapState: () => MapState.Loading(),
  })

  test('LoadedMap marks the map ready without Commands', () => {
    story(
      update,
      given(loadingModel),
      message(Message.LoadedMap()),
      model(({ mapState }) => expect(mapState).toEqual(MapState.Ready())),
      Command.expectNone(),
    )
  })

  test('FailedLoadMap records the reason', () => {
    story(
      update,
      given(loadingModel),
      message(Message.FailedLoadMap({ reason: 'No WebGL' })),
      model(({ mapState }) =>
        expect(mapState).toEqual(MapState.Failed({ reason: 'No WebGL' })),
      ),
    )
  })

  test('MovedMap keeps the camera and writes it to the URL', () => {
    const moved = { ...londonCamera, zoom: 11, bearing: 15 }
    story(
      update,
      given(readyModel),
      message(Message.MovedMap({ camera: moved })),
      model(({ maybeCamera }) =>
        expect(maybeCamera).toEqual(Option.some(moved)),
      ),
      Command.expectExact(
        ReplaceUrl({
          maybeCue: Option.none(),
          maybeCamera: Option.some(moved),
        }),
      ),
      resolveReplaceUrl,
    )
  })

  test('a URL that cannot be replaced leaves the Model as it was', () => {
    story(
      update,
      given(readyModel),
      message(Message.MovedMap({ camera: londonCamera })),
      Command.resolve(ReplaceUrl, Message.FailedReplaceUrl()),
      model(nextModel => expect(nextModel).toEqual(readyModel)),
    )
  })
})

describe('cursor', () => {
  test('MovedCursor tracks the cursor and LeftMap keeps its last position', () => {
    story(
      update,
      given(readyModel),
      message(Message.MovedCursor({ point: london })),
      model(({ cursor }) =>
        expect(cursor).toEqual(CursorState.OnMap({ point: london })),
      ),
      message(Message.LeftMap()),
      model(({ cursor }) =>
        expect(cursor).toEqual(CursorState.OffMap({ point: london })),
      ),
      message(Message.LeftMap()),
      model(({ cursor }) =>
        expect(cursor).toEqual(CursorState.OffMap({ point: london })),
      ),
    )
  })

  test('LeftMap before any movement stays idle', () => {
    story(
      update,
      given(readyModel),
      message(Message.LeftMap()),
      model(({ cursor }) => expect(cursor).toEqual(CursorState.Idle())),
    )
  })

  test('MovedCursor wraps the longitude', () => {
    story(
      update,
      given(readyModel),
      message(Message.MovedCursor({ point: { lat: 10, lon: 190 } })),
      model(({ cursor }) =>
        expect(cursor).toEqual(
          CursorState.OnMap({ point: { lat: 10, lon: -170 } }),
        ),
      ),
    )
  })
})

describe('cue', () => {
  test('ClickedMap sets the cue and writes it to the URL with the camera', () => {
    story(
      update,
      given(readyModel),
      message(Message.ClickedMap({ point: london })),
      model(({ maybeCue }) => expect(maybeCue).toEqual(Option.some(london))),
      Command.expectExact(
        ReplaceUrl({
          maybeCue: Option.some(london),
          maybeCamera: Option.some(londonCamera),
        }),
      ),
      resolveReplaceUrl,
    )
  })

  test('ClickedMap clears a stale search status', () => {
    story(
      update,
      given(readyModel),
      message(gotGoTo(GoTo.Message.UpdatedQuery({ value: 'nowhere' }))),
      message(gotGoTo(GoTo.Message.SubmittedSearch())),
      model(({ goTo }) =>
        expect(GoTo.Status.guards.SearchFailed(goTo.status)).toBe(true),
      ),
      message(Message.ClickedMap({ point: london })),
      resolveReplaceUrl,
      model(({ goTo }) => expect(goTo.status).toEqual(GoTo.Status.Idle())),
    )
  })

  test('ClickedClearCue removes the cue from the Model and the URL', () => {
    story(
      update,
      given(modifyFields(readyModel, { maybeCue: () => Option.some(london) })),
      message(Message.ClickedClearCue()),
      model(({ maybeCue }) => expect(maybeCue).toEqual(Option.none())),
      Command.expectExact(
        ReplaceUrl({
          maybeCue: Option.none(),
          maybeCamera: Option.some(londonCamera),
        }),
      ),
      resolveReplaceUrl,
    )
  })
})

describe('go to', () => {
  test('a point search sets the cue and flies the map there', () => {
    story(
      update,
      given(readyModel),
      message(gotGoTo(GoTo.Message.UpdatedQuery({ value: '51.5, -0.12' }))),
      message(gotGoTo(GoTo.Message.SubmittedSearch())),
      model(({ maybeCue, maybeCameraRequest, goTo }) => {
        expect(maybeCue).toEqual(Option.some({ lat: 51.5, lon: -0.12 }))
        expect(maybeCameraRequest).toEqual(
          Option.some({
            id: 0,
            target: CameraRequest.CameraTarget.FlyTo({
              point: { lat: 51.5, lon: -0.12 },
            }),
          }),
        )
        expect(goTo.status).toEqual(
          GoTo.Status.Found({ kind: 'DD', maybeCaution: Option.none() }),
        )
      }),
      resolveReplaceUrl,
    )
  })

  test('a cell search fits the map to the cell, and each request gets a new id', () => {
    story(
      update,
      given(readyModel),
      message(gotGoTo(GoTo.Message.UpdatedQuery({ value: '361HN37' }))),
      message(gotGoTo(GoTo.Message.SubmittedSearch())),
      resolveReplaceUrl,
      message(gotGoTo(GoTo.Message.SubmittedSearch())),
      resolveReplaceUrl,
      model(({ maybeCameraRequest }) => {
        const request = Option.getOrThrow(maybeCameraRequest)
        expect(request.id).toBe(1)
        expect(CameraRequest.CameraTarget.guards.FitBox(request.target)).toBe(
          true,
        )
      }),
    )
  })

  test('find my location sets the cue at the device position', () => {
    story(
      update,
      given(readyModel),
      message(gotGoTo(GoTo.Message.ClickedFindMyLocation())),
      Command.resolve(
        GoTo.GetCurrentPosition,
        GoTo.Message.SucceededGetCurrentPosition({
          requestId: 1,
          point: newYork,
        }),
      ),
      resolveReplaceUrl,
      model(({ maybeCue, maybeCameraRequest }) => {
        expect(maybeCue).toEqual(Option.some(newYork))
        expect(Option.isSome(maybeCameraRequest)).toBe(true)
      }),
    )
  })
})

describe('child Submodels', () => {
  test('settings changes reach the settings Submodel and are saved', () => {
    story(
      update,
      given(readyModel),
      message(
        Message.GotSettingsMessage({
          message: Settings.Message.ToggledGridLabels(),
        }),
      ),
      model(({ settings }) =>
        expect(settings.values.isGridLabelsVisible).toBe(false),
      ),
      Command.resolve(
        Settings.SaveSettings,
        Settings.Message.SucceededSaveSettings(),
      ),
    )
  })

  test('copy feedback lives in the copy Submodel', () => {
    story(
      update,
      given(readyModel),
      message(
        Message.GotCopyMessage({
          message: Copy.Message.ClickedCopy({ cellId: 'Cue-DD', text: '1, 2' }),
        }),
      ),
      Command.resolve(
        Copy.CopyText,
        Copy.Message.SucceededCopyText({ cellId: 'Cue-DD', copyId: 1 }),
      ),
      model(({ copy }) =>
        expect(HashMap.has(copy.feedbackByCellId, 'Cue-DD')).toBe(true),
      ),
      Command.resolve(
        Copy.WaitBeforeHidingCopyFeedback,
        Copy.Message.CompletedWaitBeforeHidingCopyFeedback({
          cellId: 'Cue-DD',
          copyId: 1,
        }),
      ),
      model(({ copy }) =>
        expect(HashMap.isEmpty(copy.feedbackByCellId)).toBe(true),
      ),
    )
  })
})

describe('viewport', () => {
  test('layout and pointer follow the media queries', () => {
    story(
      update,
      given(readyModel),
      message(Message.UpdatedLayout({ layout: 'Compact' })),
      message(Message.UpdatedPointer({ pointer: 'Touch' })),
      model(({ layout, pointer }) => {
        expect(layout).toBe('Compact')
        expect(pointer).toBe('Touch')
      }),
    )
  })
})
