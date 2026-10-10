set shell := ["bash", "-uc"]

# List recipes
default:
    @just --list

# Install dependencies
install:
    bun install --frozen-lockfile

# Run the Vite dev server with Foldkit DevTools
dev port="5180":
    bun run dev --port {{port}}

# Type-check the project
typecheck:
    bun run typecheck

# Lint with oxlint and the Foldkit plugin rules
lint:
    bun run lint

# Format the sources with oxfmt
format:
    bun run format

# Fail if any source is not formatted
format-check:
    bun run format:check

# Run the unit and story tests
test:
    bun run test

# Run the tests with a coverage report (text, plus HTML in coverage/)
coverage:
    bun run test --coverage

# Check formatting, lint, type-check and test with coverage
check: format-check lint typecheck coverage

# Build the static site into dist/
build:
    bun run build
    touch dist/.nojekyll

# Add the coverage badge and HTML report to dist/ (run after check and build)
publish-coverage:
    bun scripts/coverage-report.ts

# Serve the built site locally
preview port="4173": build
    bun run preview --port {{port}}

# Remove build and coverage output
clean:
    rm -rf dist coverage

# Render the app icons from public/logo.svg (needs rsvg-convert)
icons:
    ./scripts/icons.sh

# Capture README screenshots from the preview server on port 4173 (needs Google Chrome)
screenshots:
    node scripts/screenshots.mjs docs/screenshots
    sips -Z 1800 docs/screenshots/desktop-*.png > /dev/null || true
    sips -Z 1400 docs/screenshots/mobile.png > /dev/null || true

# Record the README demo GIF from the preview server on port 4173 (needs Google Chrome)
demo:
    node scripts/demo.mjs docs/demo.gif
