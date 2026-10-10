// Capture the README screenshots from a running preview (`just preview`) with headless Chrome.
// Set CHROME_PATH if Chrome is not in the default macOS location, and COORDKIT_URL for another server.
import puppeteer from 'puppeteer-core'

const out = process.argv[2] ?? 'docs/screenshots'
const base = process.env.COORDKIT_URL ?? 'http://localhost:4173/'
/** The app defaults, with per-shot overrides. */
const settings = (overrides) =>
  JSON.stringify({
    grids: { Gzd: true, Mgrs: true, Gars: false, Graticule: true },
    showLabels: true,
    basemap: 'Satellite',
    projection: 'Mercator',
    mgrsPrecision: 0,
    garsPrecision: 30,
    showRings: true,
    ringSpacing: 'Auto',
    ringUnit: 'NauticalMiles',
    ...overrides,
  })

const desktop = { width: 1440, height: 900, deviceScaleFactor: 2 }

const shots = [
  {
    name: 'desktop-satellite',
    url: `${base}?p=51.5073509,-0.1277583#view=10.4/51.505/-0.118`,
    viewport: desktop,
    settings: settings({}),
    hover: [1040, 330],
  },
  {
    name: 'desktop-dark',
    url: `${base}?p=51.5073509,-0.1277583#view=10.4/51.505/-0.118`,
    viewport: desktop,
    settings: settings({ basemap: 'Dark', grids: { Gzd: true, Mgrs: true, Gars: false, Graticule: false }, mgrsPrecision: 5, garsPrecision: 5 }),
    hover: [1040, 330],
  },
  {
    name: 'desktop-globe',
    url: `${base}?p=48.8583,2.2945#view=2.3/32/8`,
    viewport: desktop,
    settings: settings({ basemap: 'Dark', projection: 'Globe', showRings: false, grids: { Gzd: true, Mgrs: true, Gars: false, Graticule: false } }),
    hover: [880, 420],
  },
  {
    name: 'desktop-light-gars',
    url: `${base}?p=40.6892,-74.0445#view=8.6/40.75/-74.0`,
    viewport: desktop,
    settings: settings({ basemap: 'Light', grids: { Gzd: true, Mgrs: false, Gars: true, Graticule: false }, ringSpacing: '5', garsPrecision: 5 }),
    hover: [900, 380],
  },
  {
    name: 'mobile',
    url: `${base}?p=-33.8568,151.2153#view=11.2/-33.86/151.21`,
    viewport: { width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
    settings: settings({}),
  },
]

const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--hide-scrollbars'],
})
for (const shot of shots) {
  const page = await browser.newPage()
  await page.setViewport(shot.viewport)
  await page.evaluateOnNewDocument(value => localStorage.setItem('coordkit:settings:v4', value), shot.settings)
  await page.goto(shot.url, { waitUntil: 'networkidle0', timeout: 60000 })
  await new Promise(resolve => setTimeout(resolve, 2500))
  if (shot.hover) {
    await page.mouse.move(shot.hover[0], shot.hover[1])
    await new Promise(resolve => setTimeout(resolve, 300))
  }
  await page.waitForNetworkIdle({ idleTime: 1000, timeout: 30000 }).catch(() => {})
  await page.screenshot({ path: `${out}/${shot.name}.png` })
  console.log('saved', shot.name)
  await page.close()
}
await browser.close()
