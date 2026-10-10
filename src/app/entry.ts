import { Runtime } from 'foldkit'

import '@fontsource-variable/inter'
import '@fontsource-variable/jetbrains-mono'
import 'maplibre-gl/dist/maplibre-gl.css'
import '../styles.css'

import { flags } from './flags'
import { init, update } from './main'
import { Message } from './message'
import { Flags, Model } from './model'
import { subscriptions } from './subscriptions'
import { view } from './view'

const application = Runtime.makeApplication({
  Model,
  Flags,
  init,
  update,
  view,
  subscriptions,
  container: document.getElementById('root'),
  devTools: {
    Message,
    excludeFromHistory: ['MovedCursor', 'CompletedRenderOverlay'],
  },
})

Runtime.run(application, { flags })
