import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e/prb/demo',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 2,
  reporter: [['list'], ['html', { outputFolder: 'e2e/inf/demo', open: 'never' }]],
  outputDir: 'e2e/res/demo',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    locale: 'es-PE',
    timezoneId: 'America/Lima',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'escritorio', use: { ...devices['Desktop Chrome'] } },
    { name: 'movil', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: 'npm run dev -w frontend -- --mode e2e --host 127.0.0.1 --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173',
    // Evita reutilizar una aplicación con otro modo o con datos ya modificados.
    reuseExistingServer: false,
    env: { VITE_USE_MOCKS: 'true', VITE_API_URL: '/api' },
    gracefulShutdown: { signal: 'SIGTERM', timeout: 5_000 },
  },
})
