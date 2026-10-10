import gifenc from 'gifenc'
// Record the README demo GIF from a running preview (`just preview`) with headless Chrome, using the app defaults.
// Set CHROME_PATH if Chrome is not in the default macOS location, and COORDKIT_URL for another server.
import { writeFile } from 'node:fs/promises'
import pngjs from 'pngjs'
import puppeteer from 'puppeteer-core'

const { GIFEncoder, applyPalette, quantize } = gifenc
const { PNG } = pngjs

const OUT = process.argv[2] ?? 'docs/demo.gif'
const BASE = process.env.COORDKIT_URL ?? 'http://localhost:4173/'
const VIEWPORT = { width: 1280, height: 800 }
// NOTE: satellite imagery changes most pixels when the map moves, so size, frame rate and colours are kept modest.
const GIF_WIDTH = 800
const MIN_FRAME_MS = 90
const COLOURS = 128
const TRANSPARENT = COLOURS - 1

/** Headless capture has no mouse pointer, so draw a cross that follows the mouse and pulses on click. */
const installCursor = () => {
  const style = document.createElement('style')
  style.textContent = `
    #demo-cursor { position: fixed; z-index: 2147483647; pointer-events: none; width: 31px; height: 31px;
      margin: -15px 0 0 -15px; left: -100px; top: -100px; }
    #demo-cursor::after { content: ''; position: absolute; inset: 3px; border-radius: 50%;
      border: 2px solid #f5a623; opacity: 0; transform: scale(0.4); }
    #demo-cursor.click::after { animation: demo-pulse 450ms ease-out; }
    @keyframes demo-pulse { 0% { opacity: 1; transform: scale(0.4) } 100% { opacity: 0; transform: scale(1.6) } }`
  const cursor = document.createElement('div')
  cursor.id = 'demo-cursor'
  cursor.innerHTML = `<svg width="31" height="31" viewBox="0 0 31 31" fill="none" stroke-linecap="square">
    <path d="M15.5 2v9M15.5 20v9M2 15.5h9M20 15.5h9" stroke="#111113" stroke-width="4"/>
    <path d="M15.5 2v9M15.5 20v9M2 15.5h9M20 15.5h9" stroke="#f5f5f5" stroke-width="1.6"/></svg>`
  addEventListener('DOMContentLoaded', () =>
    document.body.append(style, cursor),
  )
  addEventListener(
    'mousemove',
    event => {
      cursor.style.left = `${event.clientX}px`
      cursor.style.top = `${event.clientY}px`
    },
    true,
  )
  addEventListener(
    'mousedown',
    () => {
      cursor.classList.remove('click')
      void cursor.offsetWidth
      cursor.classList.add('click')
    },
    true,
  )
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

let mouse = { x: 640, y: 420 }
/** Glide the mouse with an ease-in-out curve, so the GIF shows smooth movement. */
const glide = async (page, x, y, ms = 900) => {
  const steps = Math.max(8, Math.round(ms / 30))
  const from = mouse
  for (let i = 1; i <= steps; i++) {
    const t = i / steps
    const eased = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2
    await page.mouse.move(
      from.x + (x - from.x) * eased,
      from.y + (y - from.y) * eased,
    )
    await sleep(ms / steps)
  }
  mouse = { x, y }
}

const centreOf = async (page, selector) => {
  const box = await (await page.waitForSelector(selector)).boundingBox()
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

const browser = await puppeteer.launch({
  executablePath:
    process.env.CHROME_PATH ??
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
  args: [
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--hide-scrollbars',
  ],
})
const page = await browser.newPage()
await page.setViewport(VIEWPORT)
await page.evaluateOnNewDocument(installCursor)
await page.goto(`${BASE}#view=9.7/51.505/-0.11`, {
  waitUntil: 'networkidle0',
  timeout: 60000,
})
await sleep(2000)
await page.mouse.move(mouse.x, mouse.y)

const frames = []
const session = await page.createCDPSession()
session.on('Page.screencastFrame', ({ data, metadata, sessionId }) => {
  frames.push({ data, time: metadata.timestamp * 1000 })
  session.send('Page.screencastFrameAck', { sessionId }).catch(() => {})
})
await session.send('Page.startScreencast', { format: 'png', everyNthFrame: 1 })

// 1. Explore with the cursor: the cursor row updates live.
await sleep(400)
await glide(page, 360, 520, 1100)
await glide(page, 820, 300, 1300)
await glide(page, 640, 400, 800)
// 2. Set the cue: range rings and the cue cells appear.
await page.mouse.click(640, 400)
await sleep(1300)
// 3. Zoom in on the cue: the MGRS grid refines from 10 km to 1 km squares.
for (let i = 0; i < 9; i++) {
  await page.mouse.wheel({ deltaY: -110 })
  await sleep(170)
}
await sleep(1600)
// 4. Turn on GARS.
const gars = await centreOf(page, '::-p-aria([name="GARS"][role="switch"])')
await glide(page, gars.x, gars.y, 900)
await page.mouse.click(gars.x, gars.y)
await sleep(1500)
// 5. Search for the Eiffel Tower: the map flies there and moves the cue.
const search = await centreOf(page, 'input[type="search"]')
await glide(page, search.x, search.y, 800)
await page.mouse.click(search.x, search.y)
await page.keyboard.type('48.8584, 2.2945', { delay: 55 })
await page.keyboard.press('Enter')
await sleep(3200)
await glide(page, 760, 420, 900)
await glide(page, 560, 480, 900)
await sleep(800)

await session.send('Page.stopScreencast')
await browser.close()

// Keep frames at least MIN_FRAME_MS apart, then turn the gaps into frame delays.
const kept = frames.filter(
  (frame, index) => index === 0 || frame.time - frames[index - 1].time >= 0,
)
const sampled = []
for (const frame of kept) {
  if (sampled.length === 0 || frame.time - sampled.at(-1).time >= MIN_FRAME_MS)
    sampled.push(frame)
}

const decode = frame => {
  const png = PNG.sync.read(Buffer.from(frame.data, 'base64'))
  const scale = GIF_WIDTH / png.width
  const width = GIF_WIDTH
  const height = Math.round(png.height * scale)
  const out = new Uint8Array(width * height * 4)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const sx = Math.min(png.width - 1, Math.floor(x / scale))
      const sy = Math.min(png.height - 1, Math.floor(y / scale))
      const s = (sy * png.width + sx) * 4
      const d = (y * width + x) * 4
      out[d] = png.data[s]
      out[d + 1] = png.data[s + 1]
      out[d + 2] = png.data[s + 2]
      out[d + 3] = 255
    }
  }
  return { rgba: out, width, height }
}

const images = sampled.map(decode)

// Set DEMO_FRAMES_DIR to also save every 20th frame as a PNG, to check the recording.
if (process.env.DEMO_FRAMES_DIR) {
  for (const [index, frame] of sampled.entries()) {
    if (index % 20 === 0)
      await writeFile(
        `${process.env.DEMO_FRAMES_DIR}/frame-${index}.png`,
        Buffer.from(frame.data, 'base64'),
      )
  }
}
const { width, height } = images[0]

// One palette for the whole GIF, from a sample of frames, so unchanged pixels keep the same index.
const sampleEvery = Math.max(1, Math.floor(images.length / 12))
const sample = images.filter((_, index) => index % sampleEvery === 0)
const pool = new Uint8Array(sample.length * width * height * 4)
sample.forEach((image, index) =>
  pool.set(image.rgba, index * width * height * 4),
)
const palette = quantize(pool, TRANSPARENT)
palette.push([0, 0, 0])

const gif = GIFEncoder()
let previous = null
images.forEach((image, index) => {
  const indexed = applyPalette(image.rgba, palette.slice(0, TRANSPARENT))
  const frame = new Uint8Array(indexed)
  if (previous) {
    for (let i = 0; i < frame.length; i++) {
      if (indexed[i] === previous[i]) frame[i] = TRANSPARENT
    }
  }
  const next = sampled[index + 1]
  const delay = next
    ? Math.max(MIN_FRAME_MS, Math.round(next.time - sampled[index].time))
    : 1500
  gif.writeFrame(frame, width, height, {
    palette: index === 0 ? palette : undefined,
    delay,
    transparent: previous !== null,
    transparentIndex: TRANSPARENT,
    dispose: 1,
  })
  previous = indexed
})
gif.finish()
await writeFile(OUT, gif.bytes())
console.log(
  `${OUT}: ${images.length} frames, ${width}x${height}, ${(gif.bytes().length / 1e6).toFixed(1)} MB`,
)
