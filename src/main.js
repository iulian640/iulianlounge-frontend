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

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(i18n)

app.mount('#app')
