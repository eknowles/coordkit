import { Runtime } from 'foldkit'

import '@fontsource-variable/inter'
import '@fontsource-variable/jetbrains-mono'
import 'maplibre-gl/dist/maplibre-gl.css'

import './styles.css'
import { defineMapElement } from '../map'
import { flags } from './flags'
import { init } from './init'
import { Message } from './message'
import { Flags, Model } from './model'
import { subscriptions } from './subscription'
import { update } from './update'
import { view } from './view'

defineMapElement()

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
    excludeFromHistory: ['MovedCursor'],
  },
})

Runtime.run(application, { flags })
