import { Option } from 'effect'
import {
  Command,
  expectNoOutMessage,
  expectOutMessage,
  given,
  message,
  model,
  story,
} from 'foldkit/story'
import { describe, expect, test } from 'vitest'

import { Message, OutMessage } from './message'
import { Status, init } from './model'
import { GetCurrentPosition, clearStatus, update } from './update'

const here = { lat: 40.7128, lon: -74.006 }

describe('search', () => {
  test('a recognised coordinate reports its format and asks the parent to go there', () => {
    story(
      update,
      given(init()),
      message(Message.UpdatedQuery({ value: '  51.5, -0.12  ' })),
      message(Message.SubmittedSearch()),
      model(({ status }) =>
        expect(status).toEqual(Status.Found({ kind: 'DD' })),
      ),
      expectOutMessage(
        OutMessage.ChoseLocation({
          point: { lat: 51.5, lon: -0.12 },
          maybeBox: Option.none(),
        }),
      ),
      Command.expectNone(),
    )
  })

  test('a cell reference passes its area so the map can fit it', () => {
    story(
      update,
      given(init()),
      message(Message.UpdatedQuery({ value: '361HN37' })),
      message(Message.SubmittedSearch()),
      model(({ status }) =>
        expect(status).toEqual(Status.Found({ kind: 'GARS' })),
      ),
    )
  })

  test('an empty query asks for a coordinate', () => {
    story(
      update,
      given(init()),
      message(Message.SubmittedSearch()),
      model(({ status }) =>
        expect(status).toEqual(
          Status.SearchFailed({ reason: 'Enter a coordinate' }),
        ),
      ),
      expectNoOutMessage(),
    )
  })

  test('text that no parser accepts says so, and typing again clears it', () => {
    story(
      update,
      given(init()),
      message(Message.UpdatedQuery({ value: 'not a place!' })),
      message(Message.SubmittedSearch()),
      model(({ status }) =>
        expect(status).toEqual(
          Status.SearchFailed({ reason: 'Could not recognise "not a place!"' }),
        ),
      ),
      message(Message.UpdatedQuery({ value: '51' })),
      model(({ status }) => expect(status).toEqual(Status.Idle())),
    )
  })
})

describe('find my location', () => {
  test('a position while locating asks the parent to go there', () => {
    story(
      update,
      given(init()),
      message(Message.ClickedFindMyLocation()),
      model(({ status }) =>
        expect(status).toEqual(Status.Locating({ requestId: 1 })),
      ),
      Command.resolve(
        GetCurrentPosition,
        Message.SucceededGetCurrentPosition({ requestId: 1, point: here }),
      ),
      model(({ status }) => expect(status).toEqual(Status.Idle())),
      expectOutMessage(
        OutMessage.ChoseLocation({ point: here, maybeBox: Option.none() }),
      ),
    )
  })

  test('reports why the location is unavailable', () => {
    story(
      update,
      given(init()),
      message(Message.ClickedFindMyLocation()),
      Command.resolve(
        GetCurrentPosition,
        Message.FailedGetCurrentPosition({
          requestId: 1,
          reason: 'Location permission denied.',
        }),
      ),
      model(({ status }) =>
        expect(status).toEqual(
          Status.LocateFailed({ reason: 'Location permission denied.' }),
        ),
      ),
      expectNoOutMessage(),
    )
  })

  test('a second click while locating does not ask again', () => {
    story(
      update,
      given({
        query: '',
        status: Status.Locating({ requestId: 1 }),
        locateRequestCount: 1,
      }),
      message(Message.ClickedFindMyLocation()),
      Command.expectNone(),
    )
  })

  test('a result that arrives after the user typed is ignored', () => {
    story(
      update,
      given({
        query: '',
        status: Status.Locating({ requestId: 1 }),
        locateRequestCount: 1,
      }),
      message(Message.UpdatedQuery({ value: '5' })),
      message(
        Message.SucceededGetCurrentPosition({ requestId: 1, point: here }),
      ),
      model(({ status }) => expect(status).toEqual(Status.Idle())),
      expectNoOutMessage(),
    )
  })

  test('a late failure of an earlier request does not end a newer one', () => {
    story(
      update,
      given({
        query: '5',
        status: Status.Locating({ requestId: 2 }),
        locateRequestCount: 2,
      }),
      message(
        Message.FailedGetCurrentPosition({ requestId: 1, reason: 'Timed out' }),
      ),
      model(({ status }) =>
        expect(status).toEqual(Status.Locating({ requestId: 2 })),
      ),
      message(
        Message.SucceededGetCurrentPosition({ requestId: 2, point: here }),
      ),
      expectOutMessage(
        OutMessage.ChoseLocation({ point: here, maybeBox: Option.none() }),
      ),
    )
  })

  test('a new request after a cancelled one gets the next id', () => {
    story(
      update,
      given({ query: '', status: Status.Idle(), locateRequestCount: 1 }),
      message(Message.ClickedFindMyLocation()),
      Command.expectExact(GetCurrentPosition({ requestId: 2 })),
      Command.resolve(
        GetCurrentPosition,
        Message.SucceededGetCurrentPosition({ requestId: 2, point: here }),
      ),
    )
  })

  test('a failure with no request in flight is ignored', () => {
    story(
      update,
      given(init()),
      message(
        Message.FailedGetCurrentPosition({ requestId: 1, reason: 'Timed out' }),
      ),
      model(({ status }) => expect(status).toEqual(Status.Idle())),
    )
  })
})

test('clearStatus forgets the last result', () => {
  expect(
    clearStatus({
      query: 'x',
      status: Status.Found({ kind: 'DD' }),
      locateRequestCount: 2,
    }).model,
  ).toEqual({ query: 'x', status: Status.Idle(), locateRequestCount: 2 })
})
