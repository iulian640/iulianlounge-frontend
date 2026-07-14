import { fileURLToPath } from 'node:url'
import { mergeConfig, defineConfig, configDefaults } from 'vitest/config'
import viteConfig from './vite.config'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      exclude: [...configDefaults.exclude, 'e2e/**'],
      root: fileURLToPath(new URL('./', import.meta.url)),
      coverage: {
        // cuenta TODO src aunque ningún test lo importe (si no, el 100% de
        // dos ficheros parecería un 100% del proyecto); main.js excluido
        // como BackendApplication en JaCoCo: cero lógica propia
        include: ['src/**/*.{js,vue}'],
        exclude: ['src/main.js'],
        // el gate del enunciado: por debajo del 70% de líneas, rojo
        thresholds: { lines: 70 },
      },
    },
  }),
)
