import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
  ],
  // ADR-08: en dev la API va por el mismo origen (5173) → la cookie del refresh viaja sin CORS
  server: {
    proxy: { '/api': 'http://localhost:8080' },
  },
  resolve: {
    alias: [
      { find: '@', replacement: fileURLToPath(new URL('./src', import.meta.url)) },
      // motor WebGPU: todos los import 'three' (nuestros y los de los addons)
      // resuelven al build WebGPU; 'three/tsl' y 'three/webgpu' no se tocan
      { find: /^three$/, replacement: 'three/webgpu' },
    ],
  },
})
