import { Array } from 'effect'
import type { Html, HtmlBuilder } from 'foldkit/html'

import type { Basemap, GarsPrecision, MgrsPrecision, Projection, RingSpacing, RingUnit, Settings } from '../app/domain'
import { Message } from '../app/message'
import { segmentedView } from '../ui/segmented'
import { type SelectOption, selectView } from '../ui/select'

const ringSpacingOptions: Array.NonEmptyReadonlyArray<SelectOption<RingSpacing>> = [
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

const ringUnitOptions: Array.NonEmptyReadonlyArray<SelectOption<RingUnit>> = [
  { value: 'NauticalMiles', label: 'Nautical miles' },
  { value: 'Kilometres', label: 'Kilometres' },
]

const mgrsPrecisionOptions: Array.NonEmptyReadonlyArray<SelectOption<MgrsPrecision>> = [
  { value: 5, label: '1 m' },
  { value: 4, label: '10 m' },
  { value: 3, label: '100 m' },
  { value: 2, label: '1 km' },
  { value: 1, label: '10 km' },
  { value: 0, label: '100 km' },
]

const garsPrecisionOptions: Array.NonEmptyReadonlyArray<SelectOption<GarsPrecision>> = [
  { value: 5, label: '5′ keypad' },
  { value: 15, label: '15′ quadrant' },
  { value: 30, label: '30′ cell' },
]

const basemapOptions: Array.NonEmptyReadonlyArray<SelectOption<Basemap>> = [
  { value: 'Dark', label: 'Dark' },
  { value: 'Light', label: 'Light' },
  { value: 'Satellite', label: 'Satellite' },
]

const projectionOptions: Array.NonEmptyReadonlyArray<SelectOption<Projection>> = [
  { value: 'Globe', label: 'Globe' },
  { value: 'Mercator', label: 'Mercator' },
]

const sectionView = (heading: string, rows: ReadonlyArray<Html>, h: HtmlBuilder<Message>): Html =>
  h.section(
    [h.Class('grid gap-2')],
    [h.h2([h.Class('text-[11px] font-medium text-muted')], [heading]), ...rows],
  )

/** Settings changed less often than the toolbar controls, in the settings menu. */
export const mapSettingsView = (settings: Settings, h: HtmlBuilder<Message>): Html =>
  h.div(
    [h.Class('grid gap-4')],
    [
      sectionView(
        'Map',
        [
          segmentedView('Base map', settings.basemap, basemapOptions, basemap => Message.SelectedBasemap({ basemap }), h),
          segmentedView(
            'Projection',
            settings.projection,
            projectionOptions,
            projection => Message.SelectedProjection({ projection }),
            h,
          ),
        ],
        h,
      ),
      sectionView(
        'Precision',
        [
          selectView(
            'MGRS',
            settings.mgrsPrecision,
            mgrsPrecisionOptions,
            precision => Message.SelectedMgrsPrecision({ precision }),
            h,
          ),
          selectView(
            'GARS',
            settings.garsPrecision,
            garsPrecisionOptions,
            precision => Message.SelectedGarsPrecision({ precision }),
            h,
          ),
        ],
        h,
      ),
      sectionView(
        'Range rings',
        [
          selectView('Spacing', settings.ringSpacing, ringSpacingOptions, spacing => Message.SelectedRingSpacing({ spacing }), h),
          selectView('Unit', settings.ringUnit, ringUnitOptions, unit => Message.SelectedRingUnit({ unit }), h),
        ],
        h,
      ),
    ],
  )
