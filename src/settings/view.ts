import clsx from 'clsx'
import { Array, Option } from 'effect'
import { Submodel } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'

import { Popover, RadioGroup } from '@foldkit/ui'

import type { MapStyle, RangeRings } from '../domain'
import type { GarsPrecision } from '../systems/gars'
import type { MgrsPrecision } from '../systems/mgrs'
import { grids, isGridEnabled } from '../systems/registry'
import * as Icon from '../ui/icon'
import * as Select from '../ui/select'
import * as Swatch from '../ui/swatch'
import * as Toggle from '../ui/toggle'
import { Message } from './message'
import type { Model } from './model'
import { BasemapRadioGroup, ProjectionRadioGroup } from './radioGroup'

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
      ...Array.map(grids, grid => {
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

const sectionView = (
  heading: string,
  rows: ReadonlyArray<Html>,
  h: HtmlBuilder<Message>,
): Html =>
  h.section(
    [h.Class('grid gap-2')],
    [h.h2([h.Class('text-[11px] font-medium text-muted')], [heading]), ...rows],
  )

/** A row of radio pills: one choice from a short list, with arrow-key movement. */
const pillsView =
  (label: string, h: HtmlBuilder<Message>) =>
  <Value extends string>({
    group,
    options,
  }: RadioGroup.RenderInfo<Value>): Html =>
    h.div(
      [h.Class('flex items-center justify-between gap-2 text-xs text-faint')],
      [
        h.span([h.AriaHidden(true)], [label]),
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
                h.Class(
                  'cursor-pointer rounded px-2 py-0.5 text-xs text-muted outline-hidden hover:text-ink focus-visible:ring-2 focus-visible:ring-focus data-[checked]:bg-ink/15 data-[checked]:text-ink [@media(hover:none)]:py-1.5',
                ),
              ],
              [h.span([...option.label], [option.value])],
            ),
          ),
        ),
      ],
    )

const mapSectionView = (model: Model, h: HtmlBuilder<Message>): Html =>
  sectionView(
    'Map',
    [
      h.submodel({
        slotId: model.basemapRadioGroup.id,
        model: model.basemapRadioGroup,
        view: BasemapRadioGroup.view,
        viewInputs: {
          options: basemapOptions,
          selectedValue: Option.some(model.values.basemap),
          ariaLabel: 'Base map',
          orientation: 'Horizontal',
          toView: pillsView('Base map', h),
        },
        toParentMessage: message =>
          Message.GotBasemapRadioGroupMessage({ message }),
      }),
      h.submodel({
        slotId: model.projectionRadioGroup.id,
        model: model.projectionRadioGroup,
        view: ProjectionRadioGroup.view,
        viewInputs: {
          options: projectionOptions,
          selectedValue: Option.some(model.values.projection),
          ariaLabel: 'Projection',
          orientation: 'Horizontal',
          toView: pillsView('Projection', h),
        },
        toParentMessage: message =>
          Message.GotProjectionRadioGroupMessage({ message }),
      }),
    ],
    h,
  )

const precisionSectionView = (model: Model, h: HtmlBuilder<Message>): Html =>
  sectionView(
    'Precision',
    [
      Select.view(
        {
          id: 'mgrs-precision',
          label: 'MGRS',
          current: model.values.mgrsPrecision,
          options: mgrsPrecisionOptions,
          toMessage: precision => Message.SelectedMgrsPrecision({ precision }),
        },
        h,
      ),
      Select.view(
        {
          id: 'gars-precision',
          label: 'GARS',
          current: model.values.garsPrecision,
          options: garsPrecisionOptions,
          toMessage: precision => Message.SelectedGarsPrecision({ precision }),
        },
        h,
      ),
    ],
    h,
  )

const ringsSectionView = (model: Model, h: HtmlBuilder<Message>): Html =>
  sectionView(
    'Range rings',
    [
      Select.view(
        {
          id: 'ring-spacing',
          label: 'Spacing',
          current: model.values.ringSpacing,
          options: ringSpacingOptions,
          toMessage: spacing => Message.SelectedRingSpacing({ spacing }),
        },
        h,
      ),
      Select.view(
        {
          id: 'ring-unit',
          label: 'Unit',
          current: model.values.ringUnit,
          options: ringUnitOptions,
          toMessage: unit => Message.SelectedRingUnit({ unit }),
        },
        h,
      ),
    ],
    h,
  )

const MENU_ANCHOR: Popover.ViewInputs['anchor'] = {
  placement: 'bottom-end',
  gap: 6,
  padding: 8,
}

/** The settings button and its menu: base map, projection, precision and range rings. */
export const menuView = Submodel.defineView<Model, Message>((model, h) =>
  h.submodel({
    slotId: model.menu.id,
    model: model.menu,
    view: Popover.view,
    viewInputs: {
      anchor: MENU_ANCHOR,
      ariaLabel: 'Map settings',
      toView: ({ button, panel, backdrop, isVisible }) =>
        h.div(
          [h.Class('relative shrink-0 xl:order-last')],
          [
            h.button(
              [
                ...button,
                h.AriaLabel('Map settings'),
                h.Title('Map settings'),
                h.Class(
                  'rounded-md p-1.5 text-muted outline-hidden hover:bg-ink/10 hover:text-ink focus-visible:ring-2 focus-visible:ring-focus',
                ),
              ],
              [Icon.settings(h)],
            ),
            ...(isVisible
              ? [
                  h.div([...backdrop, h.Class('fixed inset-0 z-20')]),
                  h.div(
                    [
                      ...panel,
                      h.Class(
                        'z-30 grid w-64 gap-4 rounded-lg border border-line bg-panel p-3 text-ink shadow-lg shadow-black/40 outline-hidden',
                      ),
                    ],
                    [
                      mapSectionView(model, h),
                      precisionSectionView(model, h),
                      ringsSectionView(model, h),
                    ],
                  ),
                ]
              : []),
          ],
        ),
    },
    toParentMessage: message => Message.GotMenuMessage({ message }),
  }),
)
