import { Option, Record } from 'effect'
import type { Runtime, Update } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

import { wrapLon } from '../geo/ellipsoid'
import { MoveCamera, RenderOverlay, SetBasemap, SetProjection } from '../map/commands'
import { findGrid, isGridEnabled, parseCoordinate } from '../systems/registry'
import { CopyText, ReplaceCueInUrl, SaveSettings, WaitBeforeClearCopied } from './commands'
import { CursorState, type LatLon, MapState, SearchState, type Settings, defaultSettings } from './domain'
import { Message } from './message'
import type { Flags, Model } from './model'

// INIT

const cueFromQuery = (maybeQuery: Option.Option<string>): Option.Option<LatLon> =>
  Option.map(Option.flatMap(maybeQuery, parseCoordinate), result => result.point)

export const init: Runtime.ApplicationInit<Model, Message, Flags> = flags => ({
  model: {
    mapState: MapState.Loading(),
    maybeView: Option.none(),
    cursor: CursorState.Idle(),
    maybeCue: cueFromQuery(flags.maybeCueQuery),
    settings: Option.getOrElse(flags.maybeSettings, () => defaultSettings),
    searchQuery: '',
    search: SearchState.Idle(),
    maybeCopied: Option.none(),
    layout: flags.layout,
    pointer: flags.pointer,
  },
})

// UPDATE

type UpdateReturn = Update.Return<Model, Message>

const normalise = (point: LatLon): LatLon => ({
  lat: Math.max(-90, Math.min(90, point.lat)),
  lon: wrapLon(point.lon),
})

const maybeHostId = (model: Model): Option.Option<string> =>
  MapState.match(model.mapState, {
    Loading: () => Option.none(),
    Ready: ({ hostId }) => Option.some(hostId),
    Failed: () => Option.none(),
  })

/** Redraw the grids and the cue marker from the Model, once the map has mounted and reported a view. */
const renderOverlay = (model: Model) =>
  Option.match(Option.all({ hostId: maybeHostId(model), view: model.maybeView }), {
    onNone: () => [],
    onSome: ({ hostId, view }) => [
      RenderOverlay({
        hostId,
        view,
        gridToggles: model.settings.grids,
        showLabels: model.settings.showLabels,
        maybeCue: model.maybeCue,
        mgrsPrecision: model.settings.mgrsPrecision,
        garsPrecision: model.settings.garsPrecision,
        showRings: model.settings.showRings,
        ringSpacing: model.settings.ringSpacing,
        ringUnit: model.settings.ringUnit,
        basemap: model.settings.basemap,
      }),
    ],
  })

/** Whether a grid is on, falling back to the registry default for grids the saved settings predate. */
const maybeGridEnabled = (settings: Settings, gridId: string): Option.Option<boolean> =>
  Option.map(findGrid(gridId), grid => isGridEnabled(settings.grids, grid))

const withSettings = (model: Model, f: (settings: Settings) => Settings): Model =>
  modifyFields(model, { settings: f })

const changeSettings = (model: Model, f: (settings: Settings) => Settings): UpdateReturn => {
  const next = withSettings(model, f)
  return { model: next, commands: [SaveSettings({ settings: next.settings }), ...renderOverlay(next)] }
}

const changeCue = (model: Model, maybeCue: Option.Option<LatLon>): Model =>
  modifyFields(model, { maybeCue: () => Option.map(maybeCue, normalise) })

export const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    SucceededMountMap: ({ hostId }) => ({
      model: modifyFields(model, { mapState: () => MapState.Ready({ hostId }) }),
    }),

    FailedMountMap: ({ reason }) => ({
      model: modifyFields(model, { mapState: () => MapState.Failed({ reason }) }),
    }),

    CompletedLoadStyle: () => ({
      model,
      commands: [
        ...Option.match(maybeHostId(model), {
          onNone: () => [],
          onSome: hostId => [SetProjection({ hostId, projection: model.settings.projection })],
        }),
        ...renderOverlay(model),
      ],
    }),

    MovedMap: ({ view }) => {
      const next = modifyFields(model, { maybeView: () => Option.some(view) })
      return { model: next, commands: renderOverlay(next) }
    },

    MovedCursor: ({ point }) => ({
      model: modifyFields(model, { cursor: () => CursorState.OnMap({ point: normalise(point) }) }),
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

    ClickedMap: ({ point }) => {
      const next = changeCue(model, Option.some(point))
      return { model: next, commands: [ReplaceCueInUrl({ maybeCue: next.maybeCue }), ...renderOverlay(next)] }
    },

    ClickedClearCue: () => {
      const next = changeCue(model, Option.none())
      return { model: next, commands: [ReplaceCueInUrl({ maybeCue: Option.none() }), ...renderOverlay(next)] }
    },

    UpdatedSearchQuery: ({ value }) => ({
      model: modifyFields(model, { searchQuery: () => value, search: () => SearchState.Idle() }),
    }),

    SubmittedSearch: () => {
      return Option.match(parseCoordinate(model.searchQuery), {
        onNone: () => ({
          model: modifyFields(model, {
            search: () =>
              SearchState.Failed({
                reason: model.searchQuery.trim() ? `Could not recognise "${model.searchQuery.trim()}"` : 'Enter a coordinate',
              }),
          }),
        }),
        onSome: result => {
          const next = modifyFields(changeCue(model, Option.some(result.point)), {
            search: () => SearchState.Found({ kind: result.kind }),
          })
          const moveCamera = Option.match(maybeHostId(next), {
            onNone: () => [],
            onSome: hostId => [
              MoveCamera({ hostId, point: result.point, maybeBounds: Option.fromNullishOr(result.bounds) }),
            ],
          })
          return {
            model: next,
            commands: [ReplaceCueInUrl({ maybeCue: next.maybeCue }), ...moveCamera, ...renderOverlay(next)],
          }
        },
      })
    },

    ToggledGrid: ({ gridId }) =>
      changeSettings(model, settings =>
        modifyFields(settings, {
          grids: toggles => Record.set(toggles, gridId, !Option.getOrElse(maybeGridEnabled(settings, gridId), () => false)),
        }),
      ),

    ToggledLabels: () =>
      changeSettings(model, settings => modifyFields(settings, { showLabels: isOn => !isOn })),

    ToggledRings: () => changeSettings(model, settings => modifyFields(settings, { showRings: isOn => !isOn })),

    SelectedBasemap: ({ basemap }) => {
      const basemapChange = changeSettings(model, settings => modifyFields(settings, { basemap: () => basemap }))
      const setBasemap = Option.match(maybeHostId(model), {
        onNone: () => [],
        onSome: hostId => [SetBasemap({ hostId, basemap })],
      })
      return { model: basemapChange.model, commands: [...(basemapChange.commands ?? []), ...setBasemap] }
    },

    SelectedProjection: ({ projection }) => {
      const projectionChange = changeSettings(model, settings =>
        modifyFields(settings, { projection: () => projection }),
      )
      const setProjection = Option.match(maybeHostId(model), {
        onNone: () => [],
        onSome: hostId => [SetProjection({ hostId, projection })],
      })
      return { model: projectionChange.model, commands: [...(projectionChange.commands ?? []), ...setProjection] }
    },

    SelectedMgrsPrecision: ({ precision }) =>
      changeSettings(model, settings => modifyFields(settings, { mgrsPrecision: () => precision })),

    SelectedGarsPrecision: ({ precision }) =>
      changeSettings(model, settings => modifyFields(settings, { garsPrecision: () => precision })),

    SelectedRingSpacing: ({ spacing }) =>
      changeSettings(model, settings => modifyFields(settings, { ringSpacing: () => spacing })),

    SelectedRingUnit: ({ unit }) => changeSettings(model, settings => modifyFields(settings, { ringUnit: () => unit })),

    ChangedLayout: ({ layout }) => ({ model: modifyFields(model, { layout: () => layout }) }),

    ChangedPointer: ({ pointer }) => ({ model: modifyFields(model, { pointer: () => pointer }) }),

    ClickedCopy: ({ systemId, target, text }) => ({
      model,
      commands: [CopyText({ systemId, target, text })],
    }),

    SucceededCopy: ({ systemId, target }) => ({
      model: modifyFields(model, { maybeCopied: () => Option.some({ systemId, target }) }),
      commands: [WaitBeforeClearCopied({ systemId, target })],
    }),

    FailedCopy: () => ({ model }),

    CompletedWaitBeforeClearCopied: ({ systemId, target }) => ({
      model: modifyFields(model, {
        maybeCopied: maybeCopied =>
          Option.filter(maybeCopied, copied => copied.systemId !== systemId || copied.target !== target),
      }),
    }),

    CompletedRenderOverlay: () => ({ model }),
    CompletedSetBasemap: () => ({ model }),
    CompletedSetProjection: () => ({ model }),
    CompletedMoveCamera: () => ({ model }),
    CompletedSaveSettings: () => ({ model }),
    CompletedReplaceCueInUrl: () => ({ model }),
  })
