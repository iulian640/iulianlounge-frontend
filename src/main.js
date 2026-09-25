import '@fontsource/limelight'
import '@fontsource/cormorant/600.css'
import '@fontsource/cormorant/400-italic.css'
import '@fontsource/jost/400.css'
import '@fontsource/jost/500.css'
import '@fontsource/ibm-plex-mono/400.css'
import '@fontsource/ibm-plex-mono/500.css'
import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import i18n from './i18n'
import { installSessionExpiry } from './session'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.use(i18n)
// Sesión perdida a mitad (el refresh ya no vale) → a la puerta
installSessionExpiry(router, pinia)

app.mount('#app')
