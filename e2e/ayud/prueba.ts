import { test as base } from '@playwright/test'

/** Evita depender de Google Fonts; se conserva la API real o el MSW de cada perfil. */
export const test = base.extend<{ fuentesLocales: void }>({
  fuentesLocales: [async ({ context }, usar) => {
    await context.route('https://fonts.googleapis.com/**', (ruta) =>
      ruta.fulfill({ contentType: 'text/css', body: '' }),
    )
    await context.route('https://fonts.gstatic.com/**', (ruta) => ruta.abort())
    await usar()
  }, { auto: true }],
})

export { expect } from '@playwright/test'
