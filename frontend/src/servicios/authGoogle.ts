import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { FormularioRegistro } from '@/lib/registro'
import type { LoginRespuesta } from '@/types/api'

const ruta = '/auth/google'
const clave = 'gc.google.intento'

export type PasoGoogle =
  | { paso: 'sesion'; curso: string | null; sesion: LoginRespuesta }
  | { paso: 'vincular' | 'registro'; curso: string | null; correo: string }
  | { paso: 'pendiente'; curso: string | null }
  | { paso: 'verificarCorreo'; curso: string | null; codigoEnviado: boolean }

export function useGoogleDisponible() {
  return useQuery({
    queryKey: ['auth', 'google', 'estado'],
    queryFn: async ({ signal }) => (await api.get<{ habilitado: boolean }>(`${ruta}/estado`, { signal })).data.habilitado,
    retry: false,
    refetchOnWindowFocus: true,
  }).data === true
}

export const intentoGoogle = () => sessionStorage.getItem(clave)
export const limpiarIntentoGoogle = () => sessionStorage.removeItem(clave)

export async function iniciarGoogle(curso: string | null) {
  const { data } = await api.post<{ intento: string; url: string }>(`${ruta}/iniciar`, { curso })
  sessionStorage.setItem(clave, data.intento)
  window.location.assign(data.url)
}

type RegistroGoogle = Omit<FormularioRegistro, 'email' | 'password'>
type AccionGoogle =
  | ['continuar']
  | ['vincular', { password: string }]
  | ['verificar-correo', { codigo: string }]
  | ['registrar', RegistroGoogle]

export async function continuarGoogle(intento: string, [accion, datos]: AccionGoogle) {
  const { data } = await api.post<PasoGoogle>(`${ruta}/${accion}`, { ...datos, intento }, { timeout: 15000 })
  return data
}

/** Un retorno repetido puede llegar antes de que termine el canje original. */
export async function esperarRetornoGoogle(intento: string) {
  for (let vuelta = 0; vuelta < 12 && intentoGoogle() === intento; vuelta++) {
    const resultado = await continuarGoogle(intento, ['continuar'])
    if (resultado.paso !== 'pendiente') return resultado
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
  throw new Error('El intento ya no está disponible.')
}

export async function enviarCodigoGoogle(intento: string) {
  await api.post(`${ruta}/enviar-codigo`, { intento })
}

export async function cancelarGoogle() {
  const intento = intentoGoogle()
  limpiarIntentoGoogle()
  if (intento) await api.post(`${ruta}/cancelar`, { intento }, { timeout: 3000 }).catch(() => {})
}
