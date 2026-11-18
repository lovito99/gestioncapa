import { randomUUID } from 'node:crypto'

if (process.env.NODE_ENV !== 'test' || process.env.DB_NAME !== 'gestioncapa_e2e' || process.env.pagosEntorno !== 'sandbox') {
  throw new Error('El proveedor simulado requiere el entorno E2E de GestionCapa.')
}

const solicitar = globalThis.fetch
globalThis.fetch = async (entrada, opciones) => {
  const url = new URL(entrada instanceof Request ? entrada.url : entrada)
  if (url.origin !== 'https://sandbox-api-pw.izipay.pe') return solicitar(entrada, opciones)
  if (url.pathname === '/security/v1/Token/Generate' && opciones?.method === 'POST') {
    const datos = JSON.parse(opciones.body)
    if (datos.merchantCode === 'E2E' && /^\d+\.\d{2}$/.test(datos.amount) && /^GC[A-Z0-9]{13}$/.test(datos.orderNumber)) {
      return Response.json({ code: '00', response: { token: `e2e-${randomUUID()}` } })
    }
  }
  return Response.json({ code: 'PENDIENTE_E2E' }, { status: 409 })
}
