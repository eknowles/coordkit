import { Data, Duration, Effect, Option, Schema, String } from 'effect'
import { Command, type Update } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

import { parseCoordinate } from '../../core/systems/registry'
import { Message, OutMessage } from './message'
import { type Model, Status } from './model'

type UpdateReturn = Update.ReturnWithOutMessage<Model, Message, OutMessage>

const searchFailureReason = (query: string): string =>
  String.isEmpty(query)
    ? 'Enter a coordinate'
    : `Could not recognise "${query}"`

const submitSearch = (model: Model): UpdateReturn => {
  const query = model.query.trim()
  return Option.match(parseCoordinate(query), {
    onNone: () => ({
      model: modifyFields(model, {
        status: () =>
          Status.SearchFailed({ reason: searchFailureReason(query) }),
      }),
    }),
    onSome: ({ kind, point, maybeBounds }) => ({
      model: modifyFields(model, { status: () => Status.Found({ kind }) }),
      outMessage: OutMessage.ChoseLocation({ point, maybeBox: maybeBounds }),
    }),
  })
}

/** A location result counts only for the request in flight; typing, a search or a newer request cancels it. */
const whenAnswering = (
  model: Model,
  requestId: number,
  toResult: () => UpdateReturn,
): UpdateReturn => {
  const isCurrentRequest =
    Status.guards.Locating(model.status) && model.status.requestId === requestId
  if (isCurrentRequest) {
    return toResult()
  } else {
    return { model }
  }
}

const startLocating = (model: Model): UpdateReturn => {
  const requestId = model.locateRequestCount + 1
  return {
    model: modifyFields(model, {
      status: () => Status.Locating({ requestId }),
      locateRequestCount: () => requestId,
    }),
    commands: [GetCurrentPosition({ requestId })],
  }
}

// UPDATE

export const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    UpdatedQuery: ({ value }) => ({
      model: modifyFields(model, {
        query: () => value,
        status: () => Status.Idle(),
      }),
    }),

    SubmittedSearch: () => submitSearch(model),

    ClickedFindMyLocation: () =>
      Status.guards.Locating(model.status) ? { model } : startLocating(model),

    SucceededGetCurrentPosition: ({ requestId, point }) =>
      whenAnswering(model, requestId, () => ({
        model: modifyFields(model, { status: () => Status.Idle() }),
        outMessage: OutMessage.ChoseLocation({
          point,
          maybeBox: Option.none(),
        }),
      })),

    FailedGetCurrentPosition: ({ requestId, reason }) =>
      whenAnswering(model, requestId, () => ({
        model: modifyFields(model, {
          status: () => Status.LocateFailed({ reason }),
        }),
      })),
  })

/** The cue moved some other way (a map click, or clearing it), so the last status no longer applies. */
export const clearStatus = (model: Model): Update.Return<Model, Message> => ({
  model: modifyFields(model, { status: () => Status.Idle() }),
})

// COMMAND

class GeolocationError extends Data.TaggedError('GeolocationError')<{
  readonly reason: string
}> {}

const LOCATION_TIMEOUT = Duration.seconds(10)
const LOCATION_MAX_AGE = Duration.seconds(30)

const locationErrorText = (error: GeolocationPositionError): string => {
  if (error.code === error.PERMISSION_DENIED) {
    return 'Location permission denied.'
  }
  if (error.code === error.TIMEOUT) {
    return 'Location timed out.'
  }
  return 'Location unavailable.'
}

/** Ask the browser for the device position. The browser asks the user for permission the first time. */
export const GetCurrentPosition = Command.define('GetCurrentPosition', {
  args: { requestId: Schema.Int },
  messages: [
    Message.SucceededGetCurrentPosition,
    Message.FailedGetCurrentPosition,
  ],
  execute: ({ requestId }) =>
    Effect.callback<GeolocationPosition, GeolocationError>(resume => {
      if (typeof navigator === 'undefined' || !navigator.geolocation) {
        resume(
          Effect.fail(
            new GeolocationError({
              reason: 'This browser cannot share its location.',
            }),
          ),
        )
        return
      }
      navigator.geolocation.getCurrentPosition(
        position => resume(Effect.succeed(position)),
        error =>
          resume(
            Effect.fail(
              new GeolocationError({ reason: locationErrorText(error) }),
            ),
          ),
        {
          enableHighAccuracy: true,
          timeout: Duration.toMillis(LOCATION_TIMEOUT),
          maximumAge: Duration.toMillis(LOCATION_MAX_AGE),
        },
      )
    }).pipe(
      Effect.map(position =>
        Message.SucceededGetCurrentPosition({
          requestId,
          point: {
            lat: position.coords.latitude,
            lon: position.coords.longitude,
          },
        }),
      ),
      Effect.catch(error =>
        Effect.succeed(
          Message.FailedGetCurrentPosition({
            requestId,
            reason: error.reason,
          }),
        ),
      ),
    ),
})
