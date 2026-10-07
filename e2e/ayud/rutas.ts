/** Rutas públicas de la aplicación: expectativas, independientes del router interno. */
export const rutas = {
  login: '/login',
  admin: '/admin',
  clases: '/coordinador/clases',
  nueva: '/coordinador/clases/nueva',
  detalle: (id: string) => `/coordinador/clases/${id}`,
  asistencia: (id: string) => `/coordinador/clases/${id}/asistencia`,
  instructor: '/instructor/clases',
  qr: (id: string) => `/instructor/clases/${id}/qr`,
  participante: '/participante/clases',
  marcar: (token: string) => `/asistencia/marcar?token=${encodeURIComponent(token)}`,
} as const

export const apiReal = 'http://127.0.0.1:8180/api'
