# Agent Development Notes

This is a Foldkit app. Read [`FOLDKIT.md`](./FOLDKIT.md) before writing any code in this project. It covers the architecture, the APIs, and the conventions the project is built on.

Foldkit owns `FOLDKIT.md` and replaces it whole on upgrade. This file is yours. Anything you want an agent to know about this project goes below, where an upgrade won't touch it.

`FOLDKIT.md` reads the line below to decide whether it has already offered to vendor the Foldkit source. Leave it in place.

subtree_prompted: true

## Project Notes

### Foldkit source

`repos/foldkit` is gitignored, not a committed subtree. Run `just foldkit-source` to shallow-clone the Foldkit tag that matches the installed `foldkit` package; run it again after upgrading Foldkit. Where `FOLDKIT.md` says to add or pull the subtree, use this recipe instead. The rest of `FOLDKIT.md` applies as written: read the clone for examples and API detail, and never import from it.

### Layout

`src/` has one folder for each kind of code. The folder tells you whether a file is part of the Foldkit program, a Submodel, a view or plain TypeScript.

| Folder                                                                  | Kind             | Role                                                                                                                                                                      | May import                                 |
| ----------------------------------------------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| `src/app/`                                                              | Foldkit program  | The root: `entry.ts`, `flags.ts`, `init.ts`, `model.ts`, `message.ts`, `update.ts`, `command.ts`, `subscription.ts`, `view.ts`, `url.ts` and `styles.css`.                | everything                                 |
| `src/submodels/settings/`, `src/submodels/goTo/`, `src/submodels/copy/` | Submodel         | Each has `model.ts`, `message.ts`, `update.ts` (with its Commands), `view.ts` and an `index.ts` barrel. A folder here has state; a folder in `views/` has none.           | `core/`, `views/ui/`                       |
| `src/views/toolbar/`, `src/views/readout/`                              | View, no state   | Root views for the top toolbar and the readout. They embed the Submodel views with `h.submodel`.                                                                          | `@/` root, Submodels, `core/`, `views/ui/` |
| `src/views/ui/`                                                         | View, no state   | Shared view pieces built on `@foldkit/ui`: icons, select, switch toggle, swatch.                                                                                          | Foldkit only                               |
| `src/map/`                                                              | Adapter          | MapLibre behind the `<coordkit-map>` custom element: its property and event Schemas, `CameraRequest`, and the overlay. Only `view.ts` and `cameraRequest.ts` use Foldkit. | `@/` root (in `view.ts`), `core/`          |
| `src/core/geo/`                                                         | Plain TypeScript | Ellipsoid constants, planar geometry shared by grids, and the WGS84 geodesic (Vincenty direct).                                                                           | nothing in `src/`                          |
| `src/core/systems/`                                                     | Plain TypeScript | One folder per coordinate system, plus `types.ts` (capabilities) and `registry.ts`.                                                                                       | `core/geo/`, Effect                        |
| `src/core/domain/`                                                      | Plain TypeScript | Schemas shared by more than one module: `LatLon`, `Box`, `Camera`, `GridToggles`, `MapStyle`, `RangeRings`, `Viewport`. One owner for each concept.                       | `core/geo/`, `core/systems/`, Effect       |
| `src/test/`                                                             | Test support     | Fixtures, the fake map and the Vitest setup file.                                                                                                                         | everything                                 |

- `@/` is an alias for `src/app/`, declared in `tsconfig.json` (`paths`) and read by Vite and Vitest (`resolve.tsconfigPaths`). Import the root as `@/message` and `@/model` from outside `app/`; inside `app/`, use `./`. Foldkit's lint plugin finds the root Message by this path: it treats `../../app/message` as a Submodel called `App` and fails `no-child-message-construction-in-root`.
- `core/` must not import Foldkit, `@/`, `submodels/`, `views/` or `map/`. The `no-restricted-imports` override in `.oxlintrc.json` enforces this, so `just lint` fails on a break.

### Adding a coordinate system

1. Create `src/core/systems/<name>/` with the maths in `<name>.ts`, tests beside it, and an `index.ts` that exports whichever capabilities the system has: a `Formatter` (readout column), a `Parser` (search) and a `Grid` (map overlay, optional cue outline). The interfaces are in `src/core/systems/types.ts`.
2. Add each export to the matching list in `src/core/systems/registry.ts`. Order matters: formatters are columns left to right, parsers are tried in order, and later grids draw on top. A profile (`src/core/systems/profiles.ts`) can move a system first; add the system to a profile if that domain uses it.

3. Add the formatter to `expectations` in `src/core/systems/roundTrip.test.ts` (or to `READOUT_ONLY` if search cannot read it). That property test formats thousands of random points, including poles, the antimeridian, cell edges and UTM zone edges. It checks that the search reads each reading back, that the cell contains the point (or the point is within the reading's precision), and that formatting the parsed point gives the same text. Set `ROUND_TRIP_RUNS=50000` to search harder.

Nothing outside `src/core/systems/` names a system. `registry.test.ts` checks every formatter and parser against shared expectations.

### Other notes

- Tooling: Devbox provides Bun, just and Node. Bun installs packages and runs scripts; Vite (with `@foldkit/vite-plugin`) serves and builds; Vitest runs the tests. Use `just <recipe>`.
- `src/core/geo/` and the maths files in `src/core/systems/*/` keep imperative loops for numeric code and are tested against proj4 and the `mgrs` package. Foldkit's code-style rules apply to the app, map and view modules.
- The map is a function of the Model. `<coordkit-map>` (`src/map/element.ts`) owns MapLibre. `src/map/properties.ts` declares its properties and events once; the element and the `CustomElement.define` binding in `src/map/view.ts` both use that record. The view sets every property from the Model on each render, and the element applies only what changed. Its CustomEvents become Messages. Do not add Commands that push state into the map: add an element property instead, or DevTools time travel will stop moving the map.
- The Model keeps the `Camera` (centre, zoom, bearing, pitch). The map reports each move (`MovedMap`), and the element jumps only when the camera property changes and differs from the map, so a render during a pan never pulls the map back, but time travel moves it. During replay, Foldkit mutes declarative handlers, so a historical map cannot dispatch to the live Model.
- Animated moves (search and "Find my location") are a `CameraRequest` in the Model with an increasing id. The element flies or fits once for each new id. There is no map Command and no registry of live map instances.
- The cue (`?p=`) and the camera (`#view=zoom/lat/lon/bearing/pitch`) live in the URL. Flags read them at start; the `ReplaceUrl` Command writes them after each change (`src/app/url.ts`). MapLibre's own `hash` option is off, so the Model is the only source of truth.
- `MapState` is `Loading`, `Ready` or `Failed`. The element reports `map-ready` on MapLibre's `load` event, and `map-failed` when MapLibre cannot start or when an error comes before the first load. It sends nothing on removal, because Snabbdom removes its event listeners first.
- The overlay is drawn by MapLibre itself (`src/map/layers.ts`): one GeoJSON line layer for grids, range rings and cue cells, ordered by a `rank` property, circle layers for the cue marker, and a symbol layer for labels. `src/map/overlay.ts` builds the GeoJSON after each move. Do not bring back deck.gl for this: its globe view ignores pitch and bearing, so lines drift off the map when the globe is tilted or rotated. The element changes base map with `setStyle(..., { diff: false })` so `style.load` fires and the overlay layers are re-added.
- Profiles (`src/core/systems/profiles.ts`) are Land, Maritime and Air, from AGeoP-21 Table B-1. `values.profile` in Settings selects one. Choosing a profile replaces every grid toggle with the profile's grids; the user can change them after. The profile also orders the readout columns (`formattersFor`), the toolbar switches (`gridSwitchesFor`) and the drawing order (`gridDrawOrderFor`, passed to the map as the `profile` property). Land matches the first-visit defaults, and a test keeps them equal.
- A parser can attach a caution to its results (the third argument of `makeParser`). GARS does, because AGeoP-21 B.7.2e says GARS must not define a location; the search status shows it. Do not name a system in GoTo to do this.
- The datum is WGS 84 everywhere. `DATUM_LABEL` in `src/core/geo/ellipsoid.ts` is the one place the readout takes its name from. A system on another datum needs a transformation in `src/core/geo/` and must say so in its reading.
- Grid toggles are stored by grid id. A grid that saved settings do not list uses its registry default. Bump `STORAGE_KEY` in `src/submodels/settings/model.ts` when the saved `Values` shape changes, unless the new field has a decoding default (as `tileZoom` and `profile` do).
- The readout is a table: rows are positions (`src/views/readout/rows.ts`: Cursor, Cue) and columns are the registered formatters (`src/views/readout/columns.ts`). Add a row by adding a `ReadoutRow`; a formatter's `maybeGridId` links its column to a grid's colour swatch.
- Layout and pointer come from media-query Subscriptions (`src/app/subscription.ts`), seeded by Flags. `Compact` (under 768px) replaces the table with a sheet over the map (`sheetView` in `src/views/readout/view.ts`): one card per system in a sideways-scrolling strip, open while any row has a position, `inert` when closed; `Touch` hides the cursor row, since touch screens cannot hover. The toolbar responds with CSS breakpoints alone.
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
