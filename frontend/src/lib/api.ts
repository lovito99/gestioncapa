import axios, { AxiosError } from 'axios'
import type { ErrorApi } from '@/types/api'
import { sesion } from './sesion'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = sesion.obtenerToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (respuesta) => respuesta,
  (error: AxiosError) => {
    const url = error.config?.url ?? ''
    // Un 401 al entrar es un error de credenciales; al salir, la sesión ya se cierra igual.
    const esAcceso = url.includes('/auth/login') || url.includes('/auth/logout')
    if (error.response?.status === 401 && !esAcceso) {
      sesion.expirar()
      window.location.assign('/login')
    }
    return Promise.reject(ApiError.desde(error))
  },
)

/** Error normalizado: todas las pantallas reciben siempre la misma forma. */
export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly fields: Record<string, string>
  readonly details: Record<string, unknown>

  constructor(status: number, cuerpo: ErrorApi) {
    super(cuerpo.message)
    this.name = 'ApiError'
    this.status = status
    this.code = cuerpo.code
    this.fields = cuerpo.fields ?? {}
    this.details = cuerpo.details ?? {}
  }

  static desde(error: AxiosError): ApiError {
    const cuerpo = error.response?.data as Partial<ErrorApi> | undefined
    if (error.response && cuerpo?.code) {
      return new ApiError(error.response.status, cuerpo as ErrorApi)
    }
    return new ApiError(error.response?.status ?? 0, {
      code: 'ERROR_DE_RED',
      message: 'No pudimos conectar con el servidor. Revisa tu conexión e intenta de nuevo.',
    })
  }
}

export function esApiError(error: unknown, code?: string): error is ApiError {
  return error instanceof ApiError && (code === undefined || error.code === code)
}

/** Mensaje para mostrar al usuario: el del servidor si lo hay, o uno por defecto. */
export function mensajeDeError(error: unknown, porDefecto: string) {
  return error instanceof ApiError && error.message ? error.message : porDefecto
}
