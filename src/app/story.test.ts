import { Option } from 'effect'
import { Command, given, message, model, story } from 'foldkit/story'
import { modifyFields } from 'foldkit/struct'
import { describe, expect, test } from 'vitest'

import { MoveCamera, RenderOverlay, SetBasemap, SetProjection } from '../map/commands'
import { CopyText, ReplaceCueInUrl, SaveSettings, WaitBeforeClearCopied } from './commands'
import { CursorState, MapState, SearchState, defaultSettings } from './domain'
import { update } from './main'
import { Message } from './message'
import type { Model } from './model'

const view = { bounds: { west: -1, south: 51, east: 1, north: 52 }, zoom: 8 }

const readyModel: Model = {
  mapState: MapState.Ready({ hostId: 'map' }),
  maybeView: Option.some(view),
  cursor: CursorState.Idle(),
  maybeCue: Option.none(),
  settings: defaultSettings,
  searchQuery: '',
  search: SearchState.Idle(),
  maybeCopied: Option.none(),
  layout: 'Wide',
  pointer: 'Hover',
}

const london = { lat: 51.5073509, lon: -0.1277583 }

describe('map lifecycle', () => {
  const loadingModel = modifyFields(readyModel, {
    mapState: () => MapState.Loading(),
    maybeView: () => Option.none(),
  })

  test('the map mounting, reporting a view and loading a style each lead to a redraw', () => {
    story(
      update,
      given(loadingModel),
      message(Message.SucceededMountMap({ hostId: 'map' })),
      model(m => expect(m.mapState).toEqual(MapState.Ready({ hostId: 'map' }))),
      message(Message.MovedMap({ view })),
      model(m => expect(m.maybeView).toEqual(Option.some(view))),
      Command.resolve(RenderOverlay, Message.CompletedRenderOverlay()),
      message(Message.CompletedLoadStyle()),
      Command.expectExact(SetProjection, RenderOverlay),
      Command.resolveAll(
        [SetProjection, Message.CompletedSetProjection()],
        [RenderOverlay, Message.CompletedRenderOverlay()],
      ),
    )
  })

  test('FailedMountMap records the reason', () => {
    story(
      update,
      given(loadingModel),
      message(Message.FailedMountMap({ reason: 'No WebGL' })),
      model(m => expect(m.mapState).toEqual(MapState.Failed({ reason: 'No WebGL' }))),
    )
  })
})

describe('cursor', () => {
  test('MovedCursor tracks the cursor and LeftMap keeps its last position', () => {
    story(
      update,
      given(readyModel),
      message(Message.MovedCursor({ point: london })),
      model(m => expect(m.cursor).toEqual(CursorState.OnMap({ point: london }))),
      message(Message.LeftMap()),
      model(m => expect(m.cursor).toEqual(CursorState.OffMap({ point: london }))),
    )
  })

  test('MovedCursor wraps the longitude', () => {
    story(
      update,
      given(readyModel),
      message(Message.MovedCursor({ point: { lat: 10, lon: 190 } })),
      model(m => expect(m.cursor).toEqual(CursorState.OnMap({ point: { lat: 10, lon: -170 } }))),
    )
  })
})

describe('cue', () => {
  test('ClickedMap sets the cue, writes it to the URL and redraws the overlay', () => {
    story(
      update,
      given(readyModel),
      message(Message.ClickedMap({ point: london })),
      model(m => expect(m.maybeCue).toEqual(Option.some(london))),
      Command.expectHas(ReplaceCueInUrl, RenderOverlay),
      Command.resolveAll(
        [ReplaceCueInUrl, Message.CompletedReplaceCueInUrl()],
        [RenderOverlay, Message.CompletedRenderOverlay()],
      ),
    )
  })

  test('ClickedClearCue removes the cue', () => {
    story(
      update,
      given(modifyFields(readyModel, { maybeCue: () => Option.some(london) })),
      message(Message.ClickedClearCue()),
      model(m => expect(m.maybeCue).toEqual(Option.none())),
      Command.resolveAll(
        [ReplaceCueInUrl, Message.CompletedReplaceCueInUrl()],
        [RenderOverlay, Message.CompletedRenderOverlay()],
      ),
    )
  })

  test('the overlay waits for the map to report a view', () => {
    story(
      update,
      given(modifyFields(readyModel, { maybeView: () => Option.none() })),
      message(Message.ClickedMap({ point: london })),
      Command.expectExact(ReplaceCueInUrl),
      Command.resolve(ReplaceCueInUrl, Message.CompletedReplaceCueInUrl()),
    )
  })
})

describe('search', () => {
  test('a valid MGRS reference sets the cue and moves the camera', () => {
    story(
      update,
      given(readyModel),
      message(Message.UpdatedSearchQuery({ value: '30U XC 99319 10158' })),
      message(Message.SubmittedSearch()),
      model(m => {
        expect(m.search).toEqual(SearchState.Found({ kind: 'MGRS' }))
        const cue = Option.getOrThrow(m.maybeCue)
        expect(cue.lat).toBeCloseTo(51.5073, 3)
        expect(cue.lon).toBeCloseTo(-0.1277, 3)
      }),
      Command.expectHas(MoveCamera),
      Command.resolveAll(
        [ReplaceCueInUrl, Message.CompletedReplaceCueInUrl()],
        [MoveCamera, Message.CompletedMoveCamera()],
        [RenderOverlay, Message.CompletedRenderOverlay()],
      ),
    )
  })

  test('an empty query asks for a coordinate', () => {
    story(
      update,
      given(readyModel),
      message(Message.SubmittedSearch()),
      model(m => expect(m.search).toEqual(SearchState.Failed({ reason: 'Enter a coordinate' }))),
    )
  })

  test('an unrecognised query reports a failure and keeps the cue', () => {
    story(
      update,
      given(readyModel),
      message(Message.UpdatedSearchQuery({ value: 'not a place' })),
      message(Message.SubmittedSearch()),
      model(m => {
        expect(m.search._tag).toBe('Failed')
        expect(m.maybeCue).toEqual(Option.none())
      }),
    )
  })
})

describe('settings', () => {
  test('ToggledGrid flips one grid, saves and redraws', () => {
    story(
      update,
      given(readyModel),
      message(Message.ToggledGrid({ gridId: 'Gars' })),
      model(m => {
        expect(m.settings.grids['Gars']).toBe(true)
        expect(m.settings.grids['Mgrs']).toBe(true)
      }),
      Command.resolveAll(
        [SaveSettings, Message.CompletedSaveSettings()],
        [RenderOverlay, Message.CompletedRenderOverlay()],
      ),
    )
  })

  test('SelectedProjection switches the map projection', () => {
    story(
      update,
      given(readyModel),
      message(Message.SelectedProjection({ projection: 'Mercator' })),
      model(m => expect(m.settings.projection).toBe('Mercator')),
      Command.expectHas(SetProjection),
      Command.resolveAll(
        [SaveSettings, Message.CompletedSaveSettings()],
        [RenderOverlay, Message.CompletedRenderOverlay()],
        [SetProjection, Message.CompletedSetProjection()],
      ),
    )
  })

  test('precision changes save and redraw', () => {
    story(
      update,
      given(readyModel),
      message(Message.SelectedMgrsPrecision({ precision: 2 })),
      Command.resolveAll(
        [SaveSettings, Message.CompletedSaveSettings()],
        [RenderOverlay, Message.CompletedRenderOverlay()],
      ),
      message(Message.SelectedGarsPrecision({ precision: 30 })),
      model(m => {
        expect(m.settings.mgrsPrecision).toBe(2)
        expect(m.settings.garsPrecision).toBe(30)
      }),
      Command.resolveAll(
        [SaveSettings, Message.CompletedSaveSettings()],
        [RenderOverlay, Message.CompletedRenderOverlay()],
      ),
    )
  })

  test('SelectedBasemap swaps the map style', () => {
    story(
      update,
      given(readyModel),
      message(Message.SelectedBasemap({ basemap: 'Satellite' })),
      model(m => expect(m.settings.basemap).toBe('Satellite')),
      Command.expectHas(SetBasemap),
      Command.resolveAll(
        [SaveSettings, Message.CompletedSaveSettings()],
        [RenderOverlay, Message.CompletedRenderOverlay()],
        [SetBasemap, Message.CompletedSetBasemap()],
      ),
    )
  })
  test('ToggledGrid starts from the registry default for a grid older saved settings do not list', () => {
    story(
      update,
      given(modifyFields(readyModel, { settings: settings => modifyFields(settings, { grids: () => ({}) }) })),
      message(Message.ToggledGrid({ gridId: 'Mgrs' })),
      model(m => expect(m.settings.grids['Mgrs']).toBe(false)),
      Command.resolveAll(
        [SaveSettings, Message.CompletedSaveSettings()],
        [RenderOverlay, Message.CompletedRenderOverlay()],
      ),
    )
  })

  test('ToggledLabels hides and shows grid labels', () => {
    story(
      update,
      given(readyModel),
      message(Message.ToggledLabels()),
      model(m => expect(m.settings.showLabels).toBe(false)),
      Command.resolveAll(
        [SaveSettings, Message.CompletedSaveSettings()],
        [RenderOverlay, Message.CompletedRenderOverlay()],
      ),
    )
  })
})

describe('range rings', () => {
  test('SelectedRingSpacing and SelectedRingUnit save and redraw', () => {
    story(
      update,
      given(readyModel),
      message(Message.SelectedRingSpacing({ spacing: '2' })),
      Command.resolveAll(
        [SaveSettings, Message.CompletedSaveSettings()],
        [RenderOverlay, Message.CompletedRenderOverlay()],
      ),
      message(Message.SelectedRingUnit({ unit: 'Kilometres' })),
      model(m => {
        expect(m.settings.ringSpacing).toBe('2')
        expect(m.settings.ringUnit).toBe('Kilometres')
      }),
      Command.resolveAll(
        [SaveSettings, Message.CompletedSaveSettings()],
        [RenderOverlay, Message.CompletedRenderOverlay()],
      ),
    )
  })
})

describe('viewport', () => {
  test('ChangedLayout and ChangedPointer follow the media queries', () => {
    story(
      update,
      given(readyModel),
      message(Message.ChangedLayout({ layout: 'Compact' })),
      message(Message.ChangedPointer({ pointer: 'Touch' })),
      model(m => {
        expect(m.layout).toBe('Compact')
        expect(m.pointer).toBe('Touch')
      }),
    )
  })
})

describe('copy', () => {
  test('a copied cell shows feedback until the wait completes', () => {
    story(
      update,
      given(readyModel),
      message(Message.ClickedCopy({ systemId: 'MGRS', target: 'Cue', text: '30U XC 99319 10158' })),
      Command.resolve(CopyText, Message.SucceededCopy({ systemId: 'MGRS', target: 'Cue' })),
      model(m => expect(m.maybeCopied).toEqual(Option.some({ systemId: 'MGRS', target: 'Cue' }))),
      Command.resolve(WaitBeforeClearCopied, Message.CompletedWaitBeforeClearCopied({ systemId: 'MGRS', target: 'Cue' })),
      model(m => expect(m.maybeCopied).toEqual(Option.none())),
    )
  })
})
