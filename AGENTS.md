# Agent Development Notes

This is a Foldkit app. Read [`FOLDKIT.md`](./FOLDKIT.md) before writing any code in this project. It covers the architecture, the APIs, and the conventions the project is built on.

Foldkit owns `FOLDKIT.md` and replaces it whole on upgrade. This file is yours. Anything you want an agent to know about this project goes below, where an upgrade won't touch it.

`FOLDKIT.md` reads the line below to decide whether it has already offered to vendor the Foldkit source. Leave it in place.

subtree_prompted: true

## Project Notes

### Layout

| Folder                                    | Role                                                                                                                                                                 | May import                                    |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| `src/geo/`                                | Ellipsoid constants, planar geometry shared by grids, and the WGS84 geodesic (Vincenty direct).                                                                      | nothing in `src/`                             |
| `src/systems/`                            | One folder per coordinate system, plus `types.ts` (capabilities) and `registry.ts`. No Foldkit.                                                                      | `geo/`, Effect                                |
| `src/domain/`                             | Schemas shared by more than one module: `LatLon`, `Box`, `Camera`, `CameraRequest`, `GridToggles`, `MapStyle`, `RangeRings`, `Viewport`. One owner for each concept. | `geo/`, `systems/`, Effect                    |
| `src/settings/`, `src/goTo/`, `src/copy/` | Submodels. Each has `model.ts`, `message.ts`, `update.ts` (with its Commands), `view.ts` and an `index.ts` barrel.                                                   | `domain/`, `systems/`, `ui/`                  |
| `src/map/`                                | MapLibre adapter: the `<coordkit-map>` custom element, its property and event Schemas, and the overlay (grid lines, labels, rings and the cue).                      | `domain/`, `systems/`, root Model and Message |
| `src/toolbar/`, `src/readout/`            | Root views for the top toolbar and the readout. They embed the Submodel views with `h.submodel`.                                                                     | Submodels, `systems/`, `ui/`                  |
| `src/ui/`                                 | Shared view pieces built on `@foldkit/ui`: icons, select, switch toggle, swatch.                                                                                     | Foldkit only                                  |
| `src/*.ts`                                | The root: `model.ts`, `message.ts`, `init.ts`, `update.ts`, `command.ts`, `subscription.ts`, `flags.ts`, `url.ts`, `view.ts`, `entry.ts`.                            | everything                                    |

### Adding a coordinate system

1. Create `src/systems/<name>/` with the maths in `<name>.ts`, tests beside it, and an `index.ts` that exports whichever capabilities the system has: a `Formatter` (readout column), a `Parser` (search) and a `Grid` (map overlay, optional cue outline). The interfaces are in `src/systems/types.ts`.
2. Add each export to the matching list in `src/systems/registry.ts`. Order matters: formatters are columns left to right, parsers are tried in order, and later grids draw on top.

3. Add the formatter to `expectations` in `src/systems/roundTrip.test.ts` (or to `READOUT_ONLY` if search cannot read it). That property test formats thousands of random points, including poles, the antimeridian, cell edges and UTM zone edges. It checks that the search reads each reading back, that the cell contains the point (or the point is within the reading's precision), and that formatting the parsed point gives the same text. Set `ROUND_TRIP_RUNS=50000` to search harder.

Nothing outside `src/systems/` names a system. `registry.test.ts` checks every formatter and parser against shared expectations.

### Other notes

- Tooling: Devbox provides Bun, just and Node. Bun installs packages and runs scripts; Vite (with `@foldkit/vite-plugin`) serves and builds; Vitest runs the tests. Use `just <recipe>`.
- `src/geo/` and the maths files in `src/systems/*/` keep imperative loops for numeric code and are tested against proj4 and the `mgrs` package. Foldkit's code-style rules apply to the app, map and view modules.
- The map is a function of the Model. `<coordkit-map>` (`src/map/element.ts`) owns MapLibre. `src/map/properties.ts` declares its properties and events once; the element and the `CustomElement.define` binding in `src/map/view.ts` both use that record. The view sets every property from the Model on each render, and the element applies only what changed. Its CustomEvents become Messages. Do not add Commands that push state into the map: add an element property instead, or DevTools time travel will stop moving the map.
- The Model keeps the `Camera` (centre, zoom, bearing, pitch). The map reports each move (`MovedMap`), and the element jumps only when the camera property changes and differs from the map, so a render during a pan never pulls the map back, but time travel moves it. During replay, Foldkit mutes declarative handlers, so a historical map cannot dispatch to the live Model.
- Animated moves (search and "Find my location") are a `CameraRequest` in the Model with an increasing id. The element flies or fits once for each new id. There is no map Command and no registry of live map instances.
- The cue (`?p=`) and the camera (`#view=zoom/lat/lon/bearing/pitch`) live in the URL. Flags read them at start; the `ReplaceUrl` Command writes them after each change (`src/url.ts`). MapLibre's own `hash` option is off, so the Model is the only source of truth.
- `MapState` is `Loading`, `Ready` or `Failed`. The element reports `map-ready` on MapLibre's `load` event, and `map-failed` when MapLibre cannot start or when an error comes before the first load. It sends nothing on removal, because Snabbdom removes its event listeners first.
- The overlay is drawn by MapLibre itself (`src/map/layers.ts`): one GeoJSON line layer for grids, range rings and cue cells, ordered by a `rank` property, circle layers for the cue marker, and a symbol layer for labels. `src/map/overlay.ts` builds the GeoJSON after each move. Do not bring back deck.gl for this: its globe view ignores pitch and bearing, so lines drift off the map when the globe is tilted or rotated. The element changes base map with `setStyle(..., { diff: false })` so `style.load` fires and the overlay layers are re-added.
- Grid toggles are stored by grid id. A grid that saved settings do not list uses its registry default. Bump `STORAGE_KEY` in `src/settings/model.ts` when the saved `Values` shape changes.
- The readout is a table: rows are positions (`src/readout/rows.ts`: Cursor, Cue) and columns are the registered formatters (`src/readout/columns.ts`). Add a row by adding a `ReadoutRow`; a formatter's `maybeGridId` links its column to a grid's colour swatch.
- Layout and pointer come from media-query Subscriptions (`src/subscription.ts`), seeded by Flags. `Compact` (under 768px) replaces the table with a sheet over the map (`sheetView` in `src/readout/view.ts`): one card per system in a sideways-scrolling strip, open while any row has a position, `inert` when closed; `Touch` hides the cursor row, since touch screens cannot hover. The toolbar responds with CSS breakpoints alone.
- Grids carry two colour sets (`colors.onDark`, `colors.onLight`). `basemapTone` in `src/map/basemaps.ts` picks one per base map, and label halos follow the same tone.
- PWA: `vite-plugin-pwa` (Workbox `generateSW`) in `vite.config.ts`. The app shell and Latin fonts are precached; OpenFreeMap styles, tiles, glyphs and sprites, and Esri imagery are runtime-cached as viewed. The service worker runs only in builds (`just preview`), not in `just dev`. Icons are rendered by `scripts/icons.sh` from `public/logo.svg` and committed.
- Coverage: `just check` runs Vitest with V8 coverage and fails under the thresholds in `vitest.config.ts`. CI then runs `just publish-coverage` (`scripts/coverage-report.ts`) to put the badge and HTML report into `dist/badges/` and `dist/coverage/`. Raise the thresholds when coverage rises; do not lower them to pass.
- `docs/demo.gif` comes from `just demo` (`scripts/demo.mjs`: Chrome screencast frames, a drawn cursor, and `gifenc` with one palette and changed-pixel frames). Screenshots in `docs/screenshots/` come from `just screenshots` (headless Chrome through `puppeteer-core`, against `just preview`). Regenerate them after visible UI changes.
- Search and "Find my location" are the GoTo Submodel. Both report in one status line (`GoTo.Status`) and, on success, emit the `ChoseLocation` OutMessage; the root sets the cue, requests a camera move and writes the URL with `Update.combine`. Each location request has an id in `Status.Locating`; a result counts only when its id matches the request in flight.
- Copy feedback is the Copy Submodel: each readout cell is an `h.submodel` keyed by `${row}-${system}`, and it shows "Copied" or "Copy failed" with a polite live region.
- Effect diagnostics: `@effect/tsgo` (the Effect language service for TypeScript 7) runs inside `tsc`, so `just typecheck` and `just check` report Effect problems such as an Effect that is never run, an unhandled error or service, or an outdated Effect 4 API. Warnings fail the type check as well as errors. `bun install` runs `effect-tsgo patch --typescript` from the `prepare` script; if Effect diagnostics are missing, run `bunx effect-tsgo patch --typescript`. Command errors use tagged errors (`Data.TaggedError`) and become Messages with `Effect.catch(() => Effect.succeed(...))`, as Foldkit documents, so `catchToOrElseSucceed` is off in `tsconfig.json`. Turn off one diagnostic for one line with `// @effect-diagnostics-next-line <rule>:off` and a `// NOTE:` that says why.
- Lint and format: `just lint` runs oxlint with `@foldkit/oxlint-plugin` (`.oxlintrc.json`); `just format` runs oxfmt. `just check` runs both, so CI fails on a Foldkit rule. The configs ignore `repos/`.
- Range rings (`src/map/rings.ts`) are a cue decoration, not a coordinate system, so they are not in the registry.
- Vocabulary: the **cursor** is the live pointer position on the map; the **cue** is the last clicked or searched position.
