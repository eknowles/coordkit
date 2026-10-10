# Agent Development Notes

This is a Foldkit app. Read [`FOLDKIT.md`](./FOLDKIT.md) before writing any code in this project. It covers the architecture, the APIs, and the conventions the project is built on.

Foldkit owns `FOLDKIT.md` and replaces it whole on upgrade. This file is yours. Anything you want an agent to know about this project goes below, where an upgrade won't touch it.

`FOLDKIT.md` reads the line below to decide whether it has already offered to vendor the Foldkit source. Leave it in place.

subtree_prompted: false

## Project Notes

### Layout

| Folder | Role | May import |
| --- | --- | --- |
| `src/geo/` | Ellipsoid constants, planar geometry shared by grids, and the WGS84 geodesic (Vincenty direct). | nothing in `src/` |
| `src/systems/` | One folder per coordinate system, plus `types.ts` (capabilities) and `registry.ts`. No Foldkit. | `geo/`, Effect |
| `src/map/` | MapLibre and deck.gl adapter: the `MountMap` Mount, map Commands, overlay and label rendering. | `systems/`, `geo/`, `app/` schemas and Messages |
| `src/toolbar/`, `src/readout/` | Views for the top toolbar and the bottom readout table. | `systems/`, `ui/`, `app/` |
| `src/ui/` | Shared view pieces (icons, select). | Foldkit only |
| `src/app/` | Foldkit shell: Model, Messages, Flags, init, update, app Commands, root view, entry. | everything |

### Adding a coordinate system

1. Create `src/systems/<name>/` with the maths in `<name>.ts`, tests beside it, and an `index.ts` that exports whichever capabilities the system has: a `Formatter` (readout column), a `Parser` (search) and a `Grid` (map overlay, optional cue outline). The interfaces are in `src/systems/types.ts`.
2. Add each export to the matching list in `src/systems/registry.ts`. Order matters: formatters are columns left to right, parsers are tried in order, and later grids draw on top.

Nothing in `app/`, `map/`, `toolbar/` or `readout/` names a system. `registry.test.ts` checks every formatter and parser against shared expectations.

### Other notes

- Tooling: Devbox provides Bun, just and Node. Bun installs packages and runs scripts; Vite (with `@foldkit/vite-plugin`) serves and builds; Vitest runs the tests. Use `just <recipe>`.
- `src/geo/` and the maths files in `src/systems/*/` keep imperative loops for numeric code and are tested against proj4 and the `mgrs` package. Foldkit's code-style rules apply to the app, map and view modules.
- The live MapLibre and deck.gl instances live in `src/map/host.ts`, keyed by host id, never in the Model. Map Commands reach them by id.
- Grid labels are a MapLibre symbol layer (`src/map/labels.ts`), not a deck.gl `TextLayer`: deck.gl text does not draw on the MapLibre globe. `SetBasemap` uses `setStyle(..., { diff: false })` so `style.load` fires and the label layer is re-added.
- Grid toggles are stored by grid id. A grid that saved settings do not list uses its registry default. Bump `SETTINGS_STORAGE_KEY` when the Settings shape changes.
- The readout is a table: rows are positions (`src/readout/rows.ts`: Cursor, Cue) and columns are the registered formatters (`src/readout/columns.ts`). Add a row by adding a `ReadoutRow`; a formatter's `gridId` links its column to a grid's colour swatch.
- Layout and pointer come from media-query Subscriptions (`src/app/subscriptions.ts`), seeded by Flags. `Compact` (under 768px) transposes the readout; `Touch` hides the cursor row, since touch screens cannot hover. The toolbar responds with CSS breakpoints alone.
- Grids carry two colour sets (`colors.onDark`, `colors.onLight`). `basemapTone` in `src/map/basemaps.ts` picks one per base map, and label halos follow the same tone.
- PWA: `vite-plugin-pwa` (Workbox `generateSW`) in `vite.config.ts`. The app shell and Latin fonts are precached; Carto styles, tiles, glyphs and Esri imagery are runtime-cached as viewed. The service worker runs only in builds (`just preview`), not in `just dev`. Icons are rendered by `scripts/icons.sh` from `public/logo.svg` and committed.
- Coverage: `just check` runs Vitest with V8 coverage and fails under the thresholds in `vitest.config.ts`. CI then runs `just publish-coverage` (`scripts/coverage-report.ts`) to put the badge and HTML report into `dist/badges/` and `dist/coverage/`. Raise the thresholds when coverage rises; do not lower them to pass.
- `docs/demo.gif` comes from `just demo` (`scripts/demo.mjs`: Chrome screencast frames, a drawn cursor, and `gifenc` with one palette and changed-pixel frames). Screenshots in `docs/screenshots/` come from `just screenshots` (headless Chrome through `puppeteer-core`, against `just preview`). Regenerate them after visible UI changes.
- Range rings (`src/map/rings.ts`) are a cue decoration, not a coordinate system, so they are not in the registry.
- Vocabulary: the **cursor** is the live pointer position on the map; the **cue** is the last clicked or searched position.
