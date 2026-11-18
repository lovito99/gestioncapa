import { defineConfig, devices } from '@playwright/test'
import config from './playwright.config'
import { entornoBackendReal } from './e2e/ayud/entornoReal'

export default defineConfig({
  ...config,
  testDir: './e2e/prb/real',
  reporter: [['list'], ['html', { outputFolder: 'e2e/inf/real', open: 'never' }]],
  outputDir: 'e2e/res/real',
  use: { ...config.use, baseURL: 'http://127.0.0.1:4174' },
  projects: [{ name: 'real', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'npm run e2e:prep -w backend && npm exec -w backend -- tsx --import ../e2e/ayud/izipayE2e.mjs src/server.ts',
      url: 'http://127.0.0.1:8180/api/health',
      reuseExistingServer: false,
      env: entornoBackendReal,
      gracefulShutdown: { signal: 'SIGTERM', timeout: 5_000 },
    },
    {
      command: 'npm run dev -w frontend -- --mode e2e-real --host 127.0.0.1 --port 4174 --strictPort',
      url: 'http://127.0.0.1:4174',
      reuseExistingServer: false,
      env: {
        VITE_USE_MOCKS: 'false',
        VITE_API_URL: '/api',
        VITE_BACKEND_URL: 'http://127.0.0.1:8180',
      },
      gracefulShutdown: { signal: 'SIGTERM', timeout: 5_000 },
    },
  ],
})
