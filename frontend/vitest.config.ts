import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    // En Node las rutas relativas (/api) no existen: las pruebas usan una URL absoluta
    env: { VITE_API_URL: 'http://localhost/api' },
  },
})
