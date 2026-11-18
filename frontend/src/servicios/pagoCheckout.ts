import { z } from 'zod'
import { abrirIzipay } from './izipay'
import type { SesionPago } from './pagos'

type ResultadoCheckout = 'cerrado' | 'comunicacion' | 'resultado'
type AbrirCheckout = (sesion: unknown, alResponder: (resultado: ResultadoCheckout) => void) => Promise<void>
const sesionIzipay = z.object({
  token: z.string(), keyRSA: z.string(), comercio: z.string(), orden: z.string(), transaccionId: z.string(),
  importe: z.string(), urlIPN: z.url(), entorno: z.enum(['sandbox', 'produccion']),
  instrumento: z.enum(['TARJETA', 'YAPE']).optional(),
})
const codigoCheckout = z.object({ code: z.string() })

const checkout = new Map<string, AbrirCheckout>([
  ['IZIPAY', async (sesion, alResponder) => {
    await abrirIzipay(sesionIzipay.parse(sesion), respuesta => {
      const codigo = codigoCheckout.safeParse(respuesta).data?.code
      if (codigo === '021') alResponder('cerrado')
      else if (codigo === 'COMMUNICATION_ERROR') alResponder('comunicacion')
      else alResponder('resultado')
    })
  }],
])

export async function abrirCheckout(sesion: SesionPago, alResponder: (resultado: ResultadoCheckout) => void) {
  const abrir = checkout.get(sesion.medio)
  if (!abrir) throw new Error('El formulario de esta pasarela no está disponible.')
  await abrir(sesion.datos, alResponder)
}
