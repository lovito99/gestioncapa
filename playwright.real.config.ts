import { defineConfig, devices } from '@playwright/test'
import config from './playwright.config'
import { cuentaReal } from './e2e/ayud/datos'

export default defineConfig({
  ...config,
  testDir: './e2e/prb/real',
  reporter: [['list'], ['html', { outputFolder: 'e2e/inf/real', open: 'never' }]],
  outputDir: 'e2e/res/real',
  use: { ...config.use, baseURL: 'http://127.0.0.1:4174' },
  projects: [{ name: 'real', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'npm run e2e:prep -w backend && npm exec -w backend -- tsx src/server.ts',
      url: 'http://127.0.0.1:8180/api/health',
      reuseExistingServer: false,
      env: {
        NODE_ENV: 'test',
        DB_NAME: 'gestioncapa_e2e',
        HOST: '127.0.0.1',
        PORT: '8180',
        FRONTEND_URL: 'http://127.0.0.1:4174',
        ADMIN_EMAIL: cuentaReal.email,
        ADMIN_PASSWORD: cuentaReal.password,
        ADMIN_NAME: 'Administrador E2E',
        JWT_SECRET: 'secreto-local-exclusivo-para-pruebas-e2e',
        LOG_LEVEL: 'warn',
      },
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
