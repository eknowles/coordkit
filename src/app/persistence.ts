import { Schema } from 'effect'

import { Settings } from './domain'

/** Bump the version when the Settings shape changes; old values then fall back to the defaults. */
export const SETTINGS_STORAGE_KEY = 'coordkit:settings:v3'
export const SettingsJsonString = Schema.fromJsonString(Schema.toCodecJson(Settings))

export const CUE_URL_PARAM = 'p'
