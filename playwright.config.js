import { defineConfig, devices } from '@playwright/test'

const PORT = 5179

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: 'es-ES',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', testDir: './e2e/desktop', timeout: 120_000, use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', testDir: './e2e/mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: `npm run build && npm run preview -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 180_000,
  },
})
