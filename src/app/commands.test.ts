import { Effect, Option } from 'effect'
import { modifyFields } from 'foldkit/struct'
import { afterEach, describe, expect, test, vi } from 'vitest'

import { CopyText, ReplaceCueInUrl, SaveSettings } from './commands'
import { defaultSettings } from './domain'
import { flags } from './flags'
import { Message } from './message'

afterEach(() => {
  window.history.replaceState(null, '', '/')
  window.localStorage.clear()
  vi.unstubAllGlobals()
})

describe('app Commands', () => {
  test('ReplaceCueInUrl writes and clears the p parameter and keeps the map hash', async () => {
    window.history.replaceState(null, '', '/?other=1#view=3/50/0')
    await Effect.runPromise(ReplaceCueInUrl({ maybeCue: Option.some({ lat: 51.5, lon: -0.12 }) }).effect)
    expect(window.location.search).toBe('?other=1&p=51.5000000%2C-0.1200000')
    expect(window.location.hash).toBe('#view=3/50/0')
    await Effect.runPromise(ReplaceCueInUrl({ maybeCue: Option.none() }).effect)
    expect(window.location.search).toBe('?other=1')
  })

  test('SaveSettings stores settings that Flags read back', async () => {
    const settings = modifyFields(defaultSettings, { basemap: () => 'Satellite', ringUnit: () => 'Kilometres' })
    await Effect.runPromise(SaveSettings({ settings }).effect)
    window.history.replaceState(null, '', '/?p=51.5,-0.12')
    const loaded = await Effect.runPromise(flags)
    expect(loaded.maybeSettings).toEqual(Option.some(settings))
    expect(loaded.maybeCueQuery).toEqual(Option.some('51.5,-0.12'))
  })

  test('Flags fall back to no settings when the stored value is unreadable', async () => {
    window.localStorage.setItem('coordkit:settings:v3', '{"broken":')
    const loaded = await Effect.runPromise(flags)
    expect(loaded.maybeSettings).toEqual(Option.none())
  })

  test('CopyText reports success or failure', async () => {
    const writeText = vi.fn(() => Promise.resolve())
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    const copied = await Effect.runPromise(CopyText({ systemId: 'DD', target: 'Cue', text: '1, 2' }).effect)
    expect(writeText).toHaveBeenCalledWith('1, 2')
    expect(copied).toEqual(Message.SucceededCopy({ systemId: 'DD', target: 'Cue' }))

    writeText.mockImplementation(() => Promise.reject(new Error('denied')))
    const failed = await Effect.runPromise(CopyText({ systemId: 'DD', target: 'Cue', text: '1, 2' }).effect)
    expect(failed._tag).toBe('FailedCopy')
  })
})
