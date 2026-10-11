import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

import { foldkit } from '@foldkit/vite-plugin'
import tailwindcss from '@tailwindcss/vite'

const DAY = 24 * 60 * 60

/** Map data comes from other hosts, so it is cached as it is viewed rather than precached. */
const cacheAsViewed = (
  cacheName: string,
  maxEntries: number,
  maxAgeDays: number,
) => ({
  cacheName,
  expiration: {
    maxEntries,
    maxAgeSeconds: maxAgeDays * DAY,
    purgeOnQuotaError: true,
  },
  cacheableResponse: { statuses: [0, 200] },
})

export default defineConfig({
  // NOTE: relative asset paths let the build run from a GitHub Pages project sub-path.
  base: './',
  plugins: [
    tailwindcss(),
    foldkit(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'script-defer',
      manifest: {
        name: 'CoordKit',
        short_name: 'CoordKit',
        description:
          'Compare a WGS84 position in DD, DMS, DDM, UTM, MGRS, GARS and other coordinate systems.',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'any',
        background_color: '#111113',
        theme_color: '#18181b',
        categories: ['navigation', 'utilities'],
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
          { src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml' },
        ],
      },
      workbox: {
        // Precache the app shell and the Latin font files; other scripts load on demand below.
        globPatterns: ['**/*.{js,css,html,svg,png,ico}', '**/*latin*.woff2'],
        // NOTE: MapLibre makes a JavaScript chunk of about 1.5 MB. Workbox skips files over its 2 MB
        // default without an error, so raise the limit to keep the app precached as it grows.
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        navigateFallback: 'index.html',
        // NOTE: the coverage report and badges are published beside the app; let them load as pages.
        navigateFallbackDenylist: [/\/coverage\//, /\/badges\//],
        cleanupOutdatedCaches: true,
        // NOTE: Workbox copies each urlPattern into the service worker as source text, so a
        // matcher must not refer to anything outside itself, such as a shared constant.
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.endsWith('.woff2'),
            handler: 'CacheFirst',
            options: cacheAsViewed('fonts', 60, 365),
          },
          // NOTE: OpenFreeMap's styles and its `/planet` TileJSON name the current tile build, so
          // they revalidate; the tile, glyph and sprite URLs under a build never change.
          {
            urlPattern: ({ url }) =>
              url.hostname === 'tiles.openfreemap.org' &&
              (url.pathname.startsWith('/styles/') ||
                url.pathname === '/planet'),
            handler: 'StaleWhileRevalidate',
            options: cacheAsViewed('map-styles', 50, 30),
          },
          {
            urlPattern: ({ url }) => url.hostname === 'tiles.openfreemap.org',
            handler: 'CacheFirst',
            options: cacheAsViewed('map-tiles', 4000, 30),
          },
          {
            urlPattern: ({ url }) => url.hostname === 'server.arcgisonline.com',
            handler: 'CacheFirst',
            options: cacheAsViewed('satellite-tiles', 2000, 30),
          },
        ],
      },
    }),
  ],
  build: {
    // NOTE: MapLibre makes one chunk of about 1.5 MB; the whole app needs it at start.
    chunkSizeWarningLimit: 1600,
  },
  optimizeDeps: {
    entries: ['src/entry.ts'],
  },
})
