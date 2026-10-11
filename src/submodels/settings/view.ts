import clsx from 'clsx'
import { Array, Option } from 'effect'
import { Submodel } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'

import { Disclosure, RadioGroup } from '@foldkit/ui'

import type { MapStyle, RangeRings } from '../../core/domain'
import type { GarsPrecision } from '../../core/systems/gars'
import type { MgrsPrecision } from '../../core/systems/mgrs'
import {
  type ProfileId,
  gridSwitchesFor,
  profiles,
} from '../../core/systems/profiles'
import { isGridEnabled } from '../../core/systems/registry'
import { TileZoom } from '../../core/systems/tile'
import * as Icon from '../../views/ui/icon'
import * as Select from '../../views/ui/select'
import * as Swatch from '../../views/ui/swatch'
import * as Toggle from '../../views/ui/toggle'
import { Message } from './message'
import type { Model } from './model'
import {
  BasemapRadioGroup,
  ProfileRadioGroup,
  ProjectionRadioGroup,
} from './radioGroup'

// TOGGLES

const ringsSwatch = (isOn: boolean, h: HtmlBuilder<Message>): Html =>
  h.span([
    h.Class(
      clsx('inline-block h-2 w-2 shrink-0 rounded-full border-2 border-cue', {
        'opacity-30': !isOn,
      }),
    ),
    h.AriaHidden(true),
  ])

/** The overlay switches shown in the toolbar: each grid, its labels, and the range rings. */
export const togglesView = Submodel.defineView<Model, Message>((model, h) => {
  const { values } = model
  return h.div(
    [
      h.Role('group'),
      h.AriaLabel('Overlays'),
      h.Class('flex shrink-0 items-center gap-1'),
    ],
    [
      ...Array.map(gridSwitchesFor(values.profile), grid => {
        const isOn = isGridEnabled(values.grids, grid)
        return Toggle.view(
          {
            id: `grid-${grid.id}`,
            label: grid.label,
            description: grid.description,
            isOn,
            onToggle: Message.ToggledGrid({ gridId: grid.id }),
            swatch: Swatch.view(grid, !isOn, h),
          },
          h,
        )
      }),
      Toggle.view(
        {
          id: 'grid-labels',
          label: 'Labels',
          description: 'Grid labels on the map',
          isOn: values.isGridLabelsVisible,
          onToggle: Message.ToggledGridLabels(),
          swatch: h.empty,
        },
        h,
      ),
      h.span([h.Class('mx-1 h-5 w-px shrink-0 bg-line'), h.AriaHidden(true)]),
      Toggle.view(
        {
          id: 'range-rings',
          label: 'Rings',
          description:
            'Range rings around the cue; set their spacing and unit in Map settings',
          isOn: values.isRangeRingsVisible,
          onToggle: Message.ToggledRangeRings(),
          swatch: ringsSwatch(values.isRangeRingsVisible, h),
        },
        h,
      ),
    ],
  )
})

// MENU

const profileOptions: ReadonlyArray<ProfileId> = ['Land', 'Maritime', 'Air']

const basemapOptions: ReadonlyArray<MapStyle.Basemap> = [
  'Dark',
  'Light',
  'Satellite',
]
const projectionOptions: ReadonlyArray<MapStyle.Projection> = [
  'Globe',
  'Mercator',
]

const mgrsPrecisionOptions: Array.NonEmptyReadonlyArray<
  Select.SelectOption<MgrsPrecision>
> = [
  { value: 5, label: '1 m' },
  { value: 4, label: '10 m' },
  { value: 3, label: '100 m' },
  { value: 2, label: '1 km' },
  { value: 1, label: '10 km' },
  { value: 0, label: '100 km' },
]

const garsPrecisionOptions: Array.NonEmptyReadonlyArray<
  Select.SelectOption<GarsPrecision>
> = [
  { value: 5, label: '5′ keypad' },
  { value: 15, label: '15′ quadrant' },
  { value: 30, label: '30′ cell' },
]

const tileZoomOptions: Array.NonEmptyReadonlyArray<
  Select.SelectOption<TileZoom>
> = Array.map(TileZoom.literals, zoom => ({
  value: zoom,
  label: `Zoom ${zoom}`,
}))

const ringSpacingOptions: Array.NonEmptyReadonlyArray<
  Select.SelectOption<RangeRings.RingSpacing>
> = [
  { value: 'Auto', label: 'Auto (by zoom)' },
  { value: '0.25', label: '0.25' },
  { value: '0.5', label: '0.5' },
  { value: '1', label: '1' },
  { value: '2', label: '2' },
  { value: '5', label: '5' },
  { value: '10', label: '10' },
  { value: '25', label: '25' },
  { value: '50', label: '50' },
  { value: '100', label: '100' },
]

const ringUnitOptions: Array.NonEmptyReadonlyArray<
  Select.SelectOption<RangeRings.RingUnit>
> = [
  { value: 'NauticalMiles', label: 'Nautical miles' },
  { value: 'Kilometres', label: 'Kilometres' },
]

/** Every setting is a field with its label on top. The panel sets the width: one column beside the map, a wrapping grid on phones. */
const FIELD_CLASS = 'grid min-w-0 gap-1'
const FIELD_LABEL_CLASS = 'text-[11px] font-medium text-faint'

/** A row of radio pills under its label: one choice from a short list, with arrow-key movement. */
const pillsView =
  <Value extends string>(
    label: string,
    toTitle: (value: Value) => Option.Option<string>,
    h: HtmlBuilder<Message>,
  ) =>
  ({ group, options }: RadioGroup.RenderInfo<Value>): Html =>
    h.div(
      [h.Class(FIELD_CLASS)],
      [
        h.span([h.Class(FIELD_LABEL_CLASS), h.AriaHidden(true)], [label]),
        h.div(
          [
            ...group,
            h.Class('flex rounded-md border border-line bg-surface p-0.5'),
          ],
          Array.map(options, option =>
            h.keyed('div')(
              option.value,
              [
                ...option.option,
                ...Option.match(toTitle(option.value), {
                  onNone: () => [],
                  onSome: title => [h.Title(title)],
                }),
                h.Class(
                  'flex-1 cursor-pointer rounded px-1 py-0.5 text-center text-xs text-muted outline-hidden hover:text-ink focus-visible:ring-2 focus-visible:ring-focus data-[checked]:bg-ink/15 data-[checked]:text-ink [@media(hover:none)]:py-1.5',
                ),
              ],
              [h.span([...option.label], [option.value])],
            ),
          ),
        ),
      ],
    )

const noTitle = (): Option.Option<string> => Option.none()

/** A profile's pill shows its description on hover. */
const profileTitle = (profileId: ProfileId): Option.Option<string> =>
  Option.some(profiles[profileId].description)

const selectField = (control: Html, h: HtmlBuilder<Message>): Html =>
  h.div([h.Class(FIELD_CLASS)], [control])

type Field = Readonly<{ id: string; view: Html }>

/** Every setting, in order. Land, Maritime or Air (AGeoP-21 Table B-1) comes first, as it changes the most. */
const fields = (
  model: Model,
  h: HtmlBuilder<Message>,
): ReadonlyArray<Field> => [
  {
    id: 'profile',
    view: h.submodel({
      slotId: model.profileRadioGroup.id,
      model: model.profileRadioGroup,
      view: ProfileRadioGroup.view,
      viewInputs: {
        options: profileOptions,
        selectedValue: Option.some(model.values.profile),
        ariaLabel: 'Profile',
        orientation: 'Horizontal',
        toView: pillsView('Profile', profileTitle, h),
      },
      toParentMessage: message =>
        Message.GotProfileRadioGroupMessage({ message }),
    }),
  },
  {
    id: 'basemap',
    view: h.submodel({
      slotId: model.basemapRadioGroup.id,
      model: model.basemapRadioGroup,
      view: BasemapRadioGroup.view,
      viewInputs: {
        options: basemapOptions,
        selectedValue: Option.some(model.values.basemap),
        ariaLabel: 'Base map',
        orientation: 'Horizontal',
        toView: pillsView('Base map', noTitle, h),
      },
      toParentMessage: message =>
        Message.GotBasemapRadioGroupMessage({ message }),
    }),
  },
  {
    id: 'projection',
    view: h.submodel({
      slotId: model.projectionRadioGroup.id,
      model: model.projectionRadioGroup,
      view: ProjectionRadioGroup.view,
      viewInputs: {
        options: projectionOptions,
        selectedValue: Option.some(model.values.projection),
        ariaLabel: 'Projection',
        orientation: 'Horizontal',
        toView: pillsView('Projection', noTitle, h),
      },
      toParentMessage: message =>
        Message.GotProjectionRadioGroupMessage({ message }),
    }),
  },
  {
    id: 'mgrs-precision',
    view: selectField(
      Select.view(
        {
          id: 'mgrs-precision',
          label: 'MGRS precision',
          current: model.values.mgrsPrecision,
          options: mgrsPrecisionOptions,
          toMessage: precision => Message.SelectedMgrsPrecision({ precision }),
        },
        h,
      ),
      h,
    ),
  },
  {
    id: 'gars-precision',
    view: selectField(
      Select.view(
        {
          id: 'gars-precision',
          label: 'GARS precision',
          current: model.values.garsPrecision,
          options: garsPrecisionOptions,
          toMessage: precision => Message.SelectedGarsPrecision({ precision }),
        },
        h,
      ),
      h,
    ),
  },
  {
    id: 'tile-zoom',
    view: selectField(
      Select.view(
        {
          id: 'tile-zoom',
          label: 'Map tile zoom',
          current: model.values.tileZoom,
          options: tileZoomOptions,
          toMessage: zoom => Message.SelectedTileZoom({ zoom }),
        },
        h,
      ),
      h,
    ),
  },
  {
    id: 'ring-spacing',
    view: selectField(
      Select.view(
        {
          id: 'ring-spacing',
          label: 'Ring spacing',
          current: model.values.ringSpacing,
          options: ringSpacingOptions,
          toMessage: spacing => Message.SelectedRingSpacing({ spacing }),
        },
        h,
      ),
      h,
    ),
  },
  {
    id: 'ring-unit',
    view: selectField(
      Select.view(
        {
          id: 'ring-unit',
          label: 'Ring unit',
          current: model.values.ringUnit,
          options: ringUnitOptions,
          toMessage: unit => Message.SelectedRingUnit({ unit }),
        },
        h,
      ),
      h,
    ),
  },
]

const keyedFields = (
  model: Model,
  h: HtmlBuilder<Message>,
): ReadonlyArray<Html> =>
  Array.map(fields(model, h), field =>
    h.keyed('div')(field.id, [h.Class('contents')], [field.view]),
  )

const PANEL_LABEL = 'Map settings'
const DISCLOSURE_ID = 'map-settings'

/** Wide screens: the settings sit in a narrow column beside the map, one field under another. */
export const sidePanelView = Submodel.defineView<Model, Message>((model, h) =>
  h.aside(
    [
      h.AriaLabel(PANEL_LABEL),
      h.Class(
        'flex w-52 shrink-0 flex-col gap-3 overflow-y-auto border-l border-line bg-panel p-3 text-ink',
      ),
    ],
    keyedFields(model, h),
  ),
)

const toggledPanel = (isOpen: boolean): Message =>
  Message.ToggledPanel({ isOpen })

/** Compact screens: the toolbar button that opens and closes the settings strip. */
export const panelButtonView = Submodel.defineView<Model, Message>((model, h) =>
  Disclosure.view(
    {
      id: DISCLOSURE_ID,
      isOpen: model.values.isPanelOpen,
      onToggle: toggledPanel,
      ariaLabel: PANEL_LABEL,
      toView: ({ button }) =>
        h.button(
          [
            ...button,
            h.Title(PANEL_LABEL),
            h.Class(
              'shrink-0 rounded-md p-1.5 text-muted outline-hidden hover:bg-ink/10 hover:text-ink focus-visible:ring-2 focus-visible:ring-focus data-[open]:bg-ink/15 data-[open]:text-ink',
            ),
          ],
          [Icon.settings(h)],
        ),
    },
    h,
  ),
)

/**
 * Compact screens: the fields wrap under the toolbar in columns at least 10rem wide, two to a
 * row on most phones, and scroll if they are taller than the space allows. The toolbar button opens and closes them.
 */
export const compactPanelView = Submodel.defineView<Model, Message>(
  (model, h) =>
    Disclosure.view(
      {
        id: DISCLOSURE_ID,
        isOpen: model.values.isPanelOpen,
        onToggle: toggledPanel,
        toView: ({ panel, animatePanel }) =>
          h.section(
            [...panel, h.AriaLabel(PANEL_LABEL)],
            [
              animatePanel(
                h.div(
                  [
                    h.Class(
                      'grid max-h-[40vh] grid-cols-[repeat(auto-fill,minmax(10rem,1fr))] gap-x-3 gap-y-2 overflow-y-auto pb-1 pt-1 text-ink',
                    ),
                  ],
                  keyedFields(model, h),
                ),
              ),
            ],
          ),
      },
      h,
    ),
)
