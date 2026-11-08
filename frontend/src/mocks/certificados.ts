import { pdfTextoDemo } from './pdfTexto'
import { http, HttpResponse } from 'msw'
import type { CertificadoDocumento } from '@/servicios/certificados'
import { usuarios } from './datos'

const API = import.meta.env.VITE_API_URL ?? '/api'

/** Lo que guarda el backend además de los datos públicos: a qué curso y agremiado pertenece. */
export type CertificadoGuardado = CertificadoDocumento & {
  cursoId?: string
  agremiadoId?: string
  porExcepcion?: boolean
  /** Motivo de la excepción, la anulación o la corrección; nunca se muestra en la verificación pública */
  motivo?: string
}

const liderazgo = {
  tipo: 'PARTICIPACION',
  nombre: 'Rosa Elena Ccahuana Palomino',
  dniEnmascarado: '****1234',
  curso: 'Liderazgo pedagógico',
  modalidad: 'PRESENCIAL',
  horasLectivas: 24,
  fechaInicio: '2026-09-07',
  fechaFin: '2026-09-28',
  instructorNombre: 'Jorge Huamán Torres',
  emitidoEn: '2026-10-05T15:00:00Z',
} as const

/** Códigos de prueba: los mismos del Figma, más el certificado demo del historial (HU-18). */
export const certificados: CertificadoGuardado[] = [
  { ...liderazgo, codigo: 'CPPP-7K4M-Q9X2', estado: 'VALIDO', reemplazadoPor: null },
  { ...liderazgo, codigo: 'CPPP-2B6F-H8Z4', estado: 'ANULADO', reemplazadoPor: null },
  { ...liderazgo, codigo: 'CPPP-3H8R-T5N1', estado: 'REEMPLAZADO', reemplazadoPor: 'CPPP-9P2D-L6W3' },
  { ...liderazgo, codigo: 'CPPP-9P2D-L6W3', estado: 'VALIDO', reemplazadoPor: null },
  {
    codigo: 'DEMO-HU18-MARIA-SEGURIDAD',
    estado: 'VALIDO',
    reemplazadoPor: null,
    tipo: 'APROBACION',
    nombre: 'María Fernanda Quispe Ramos',
    dniEnmascarado: '****5678',
    curso: 'Demo · Seguridad y primeros auxilios',
    modalidad: 'HIBRIDA',
    horasLectivas: 24,
    fechaInicio: '2026-10-19',
    fechaFin: '2026-10-20',
    instructorNombre: 'Carlos Mendoza Ríos',
    emitidoEn: '2026-10-24T15:00:00Z',
  },
]

// Sin I, O, 0 ni 1: así el código no se confunde al escribirlo
const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
function nuevoCodigo() {
  const parte = () => Array.from({ length: 4 }, () => ALFABETO[Math.floor(Math.random() * ALFABETO.length)]).join('')
  let codigo: string
  do codigo = `CPPP-${parte()}-${parte()}`
  while (certificados.some((c) => c.codigo === codigo))
  return codigo
}

/** Emite un certificado nuevo (lo usa el cierre del curso, 2.4) y devuelve su código. */
export function emitirCertificado(datos: Omit<CertificadoGuardado, 'codigo' | 'estado' | 'reemplazadoPor' | 'emitidoEn'>) {
  const certificado: CertificadoGuardado = { ...datos, codigo: nuevoCodigo(), estado: 'VALIDO', reemplazadoPor: null, emitidoEn: new Date().toISOString() }
  certificados.push(certificado)
  return certificado
}

/** El certificado vigente (o el último anulado) de un agremiado en un curso; los reemplazados se saltan. */
export const certificadoDe = (cursoId: string, agremiadoId: string) =>
  certificados.findLast((c) => c.cursoId === cursoId && c.agremiadoId === agremiadoId && c.estado !== 'REEMPLAZADO')

const error = (status: number, code: string, message: string, fields?: Record<string, string>) =>
  HttpResponse.json({ code, message, ...(fields ? { fields } : {}) }, { status })

function soloAdmin(request: Request) {
  const usuario = usuarios.find((u) => request.headers.get('Authorization') === `Bearer demo-${u.id}`)
  if (!usuario) return error(401, 'NO_AUTENTICADO', 'Tu sesión expiró. Vuelve a iniciar sesión.')
  if (usuario.rol !== 'ADMIN') return error(403, 'SIN_PERMISO', 'No tienes permiso para realizar esta acción.')
  return null
}

function vigente(codigo: string) {
  const certificado = certificados.find((c) => c.codigo === codigo.trim().toUpperCase())
  if (!certificado) return { fallo: error(404, 'CERTIFICADO_NO_EXISTE', 'No encontramos un certificado con ese código.') }
  if (certificado.estado !== 'VALIDO') {
    return { fallo: error(409, 'CERTIFICADO_NO_VIGENTE', 'Este certificado ya fue anulado o reemplazado.') }
  }
  return { certificado }
}

export const handlersCertificados = [
  // Pública a propósito: cualquiera con el código (o el QR) puede verificar un certificado.
  http.get(`${API}/certificados/:codigo`, ({ params }) => {
    const codigo = String(params.codigo).trim().toUpperCase()
    const certificado = certificados.find((c) => c.codigo === codigo)
    if (!certificado) {
      return error(404, 'CERTIFICADO_NO_EXISTE', 'No encontramos un certificado con ese código. Revisa que esté bien escrito.')
    }
    const { codigo: clave, estado, reemplazadoPor, tipo, nombre, curso, horasLectivas, emitidoEn } = certificado
    return HttpResponse.json({ codigo: clave, estado, reemplazadoPor, tipo, nombre, curso, horasLectivas, emitidoEn, demo: true })
  }),

  ...['documento', 'archivo'].map(accion => http.get(`${API}/certificados/:codigo/${accion}`, ({ request, params }) => {
    const usuario = usuarios.find(u => u.activo !== false && request.headers.get('Authorization') === `Bearer demo-${u.id}`)
    if (!usuario) return error(401, 'NO_AUTENTICADO', 'Inicia sesión para descargar tu certificado.')
    const certificado = certificados.find(c => c.codigo === String(params.codigo).toUpperCase())
    if (!certificado) return error(404, 'CERTIFICADO_NO_EXISTE', 'No encontramos ese certificado.')
    const titular = certificado.agremiadoId ?? (certificado.codigo === 'DEMO-HU18-MARIA-SEGURIDAD' ? 'p-1' : null)
    if (usuario.rol !== 'ADMIN' && usuario.id !== titular) return error(403, 'SIN_PERMISO', 'No tienes permiso para descargar este certificado.')
    if (certificado.estado !== 'VALIDO') return error(409, 'CERTIFICADO_NO_VIGENTE', 'El certificado fue anulado o reemplazado.')
    if (accion === 'documento') return HttpResponse.json({ ...certificado, demo: true })
    return new HttpResponse(pdfTextoDemo('Constancia de demostración', ['DEMO - SIN VALIDEZ OFICIAL', certificado.nombre, certificado.curso, certificado.codigo]) as Uint8Array<ArrayBuffer>, {
      headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="constancia-${certificado.codigo}.pdf"` },
    })
  })),

  // 2.5a · Anular: la verificación pública lo mostrará «Anulado»
  http.post(`${API}/certificados/:codigo/anular`, async ({ request, params }) => {
    const fallo = soloAdmin(request)
    if (fallo) return fallo
    const { motivo = '' } = (await request.json()) as { motivo?: string }
    if (!motivo.trim()) return error(422, 'VALIDACION', 'Ingresa el motivo de la anulación.', { motivo: 'Ingresa el motivo de la anulación.' })
    const { certificado, fallo: noVigente } = vigente(String(params.codigo))
    if (noVigente) return noVigente
    Object.assign(certificado!, { estado: 'ANULADO', motivo: motivo.trim() })
    return new HttpResponse(null, { status: 204 })
  }),

  // 2.5c · Corregir: el anterior queda «Reemplazado» y se emite uno nuevo con otro código
  http.post(`${API}/certificados/:codigo/corregir`, async ({ request, params }) => {
    const fallo = soloAdmin(request)
    if (fallo) return fallo
    const { nombre = '', motivo = '' } = (await request.json()) as { nombre?: string; motivo?: string }
    const fields: Record<string, string> = {}
    if (!nombre.trim()) fields.nombre = 'Ingresa el nombre corregido.'
    if (!motivo.trim()) fields.motivo = 'Ingresa el motivo de la corrección.'
    if (Object.keys(fields).length) return error(422, 'VALIDACION', 'Revisa los campos marcados.', fields)
    const { certificado, fallo: noVigente } = vigente(String(params.codigo))
    if (noVigente) return noVigente
    const { codigo: _codigo, estado: _estado, reemplazadoPor: _r, emitidoEn: _e, ...resto } = certificado!
    const nuevo = emitirCertificado({ ...resto, nombre: nombre.trim(), motivo: motivo.trim() })
    Object.assign(certificado!, { estado: 'REEMPLAZADO', reemplazadoPor: nuevo.codigo })
    return HttpResponse.json({ codigo: nuevo.codigo }, { status: 201 })
  }),
]
