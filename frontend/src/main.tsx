import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { Toaster } from 'sonner'
import { AuthProvider } from '@/auth/AuthContext'
import { ApiError } from '@/lib/api'
import { modoDemoActivo } from '@/lib/aulaGrabadaDemo'
import { router } from '@/rutas'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    // Un 4xx (sin permiso, no existe, validación) no cambia al reintentar: solo duplica la llamada.
    queries: { retry: (fallos, error) => fallos < 1 && !(error instanceof ApiError && error.status >= 400 && error.status < 500), refetchOnWindowFocus: false },
  },
})

/** Mientras el backend no esté listo, las llamadas a la API las responde MSW. */
async function iniciarMocks() {
  if (!modoDemoActivo) return
  const { worker } = await import('./mocks/browser')
  await worker.start({ onUnhandledFrame: 'bypass' })
}

iniciarMocks().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
        <Toaster position="top-right" richColors closeButton />
      </QueryClientProvider>
    </StrictMode>,
  )
})
