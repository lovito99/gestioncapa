import { http, HttpResponse } from 'msw'
import { asistencias, clases, inscripciones, usuarios } from './datos'
import { cursosSimulados, inscripcionesCursosDemo } from './cursos'
import { pdfTextoDemo } from './pdfTexto'
import type { Historial, ResumenAsistencia, SesionHistorial } from '@/servicios/historial'
const API = import.meta.env.VITE_API_URL ?? '/api'
const fallo = (status: number, mensaje: string) => HttpResponse.json({ code: status === 403 ? 'SIN_PERMISO' : status === 401 ? 'NO_AUTENTICADO' : 'HISTORIAL_NO_EXISTE', message: mensaje }, { status, headers: { 'Cache-Control': 'private, no-store' } })
function acceso(request: Request, id?: string) {
  const actor = usuarios.find(u => request.headers.get('Authorization') === `Bearer demo-${u.id}`)
  if (!actor) return { error: fallo(401, 'Tu sesión expiró. Vuelve a iniciar sesión.') }
  if (!['ADMIN', 'PARTICIPANTE'].includes(actor.rol) || (actor.rol !== 'ADMIN' && (!id || id !== actor.id))) return { error: fallo(403, 'No tienes permiso para ver el historial de otro colegiado.') }
  const persona = id ? usuarios.find(u => u.id === id && u.rol === 'PARTICIPANTE') : undefined
  if (id && !persona) return { error: fallo(404, 'El colegiado no existe.') }
  return { actor, persona }
}
const dni = (id: string) => id === 'p-1' ? '****1234' : id === 'p-7' ? '****5678' : null
const resumen = (sesiones: SesionHistorial[]): ResumenAsistencia => {
  const realizadas = sesiones.filter(s => s.contabiliza)
  const presentes = realizadas.filter(s => s.estado === 'PRESENTE').length
  return { presentes, realizadas: realizadas.length, porcentaje: realizadas.length ? Math.round(presentes * 10000 / realizadas.length) / 100 : null }
}
function historialDe(id: string): Historial {
  const persona = usuarios.find(u => u.id === id)!
  const fecha = (dias: number) => new Date(Date.now() + dias * 86400000).toISOString()
  const cursos = cursosSimulados.filter(c => inscripcionesCursosDemo.get(c.id)?.has(id)).map(curso => {
    const indice = curso.titulo === 'Demo · Seguridad y primeros auxilios' ? 0 : curso.titulo === 'Demo · Didáctica y evaluación' ? 1 : 2
    const terminado = id === 'p-1' && indice === 0
    const sesiones: SesionHistorial[] = (indice > 1 ? [] : [0, 1]).map(n => ({ id: `hist-${curso.id}-${n}`, cursoId: curso.id,
      titulo: `Sesión ${n + 1} de ${curso.titulo}`, fecha: fecha(indice === 0 ? -15 + n : n === 0 ? -3 : 10).slice(0, 10), horaInicio: '08:00', horaFin: '09:00',
      estado: indice === 1 && n === 1 ? 'PENDIENTE' : (id === 'p-1' ? n === 0 : n === 1) ? 'PRESENTE' : 'AUSENTE', contabiliza: !(indice === 1 && n === 1), horaRegistro: null }))
    return { id: curso.id, titulo: curso.titulo, estado: terminado ? 'TERMINADO' as const : 'EN_CURSO' as const, horasLectivas: curso.horasLectivas, modalidad: curso.modalidad, inscritoEn: fecha(-30), terminadoEn: terminado ? fecha(-10) : null,
      sesiones, asistencia: resumen(sesiones), certificados: terminado ? [{ id: 'cert-demo-maria', cursoId: curso.id, codigo: 'DEMO-HU18-MARIA-SEGURIDAD', tipo: 'APROBACION' as const, emitidoEn: fecha(-9) }] : [] }
  })
  const independientes: SesionHistorial[] = clases.filter(c => inscripciones[c.id]?.includes(id)).map(c => {
    const hora = asistencias[c.id]?.[id] ?? null
    const iniciada = new Date(`${c.fecha}T${c.horaInicio}:00-05:00`).getTime() <= Date.now()
    return { id: c.id, cursoId: null, titulo: c.nombre, fecha: c.fecha, horaInicio: c.horaInicio, horaFin: c.horaFin,
      estado: c.estado === 'CANCELADA' ? 'CANCELADA' : hora ? 'PRESENTE' : iniciada ? 'AUSENTE' : 'PENDIENTE', contabiliza: iniciada && c.estado !== 'CANCELADA', horaRegistro: hora }
  })
  return { colegiado: { id, nombre: persona.nombre, dniEnmascarado: dni(id) }, generadoEn: fecha(0), cursos, sesionesIndependientes: independientes, asistenciaGeneral: resumen([...cursos.flatMap(c => c.sesiones), ...independientes]) }
}
const pdf = (bytes: Uint8Array, nombre: string) => new HttpResponse(bytes as Uint8Array<ArrayBuffer>, { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${nombre}"`, 'Cache-Control': 'private, no-store' } })
export const handlersHistorial = [
  http.get(`${API}/colegiados`, ({ request }) => {
    const auth = acceso(request); if (auth.error) return auth.error
    return HttpResponse.json(usuarios.filter(u => u.rol === 'PARTICIPANTE').map(u => ({ id: u.id, nombre: u.nombre, dniEnmascarado: dni(u.id) })), { headers: { 'Cache-Control': 'private, no-store' } })
  }),
  http.get(`${API}/colegiados/:usuarioId/historial`, ({ request, params }) => {
    const auth = acceso(request, String(params.usuarioId)); if (auth.error) return auth.error
    return HttpResponse.json(historialDe(auth.persona!.id), { headers: { 'Cache-Control': 'private, no-store' } })
  }),
  http.get(`${API}/colegiados/:usuarioId/historial/pdf`, ({ request, params }) => {
    const auth = acceso(request, String(params.usuarioId)); if (auth.error) return auth.error
    const h = historialDe(auth.persona!.id)
    const lineas = [`Colegiado: ${h.colegiado.nombre}`, `DNI: ${h.colegiado.dniEnmascarado ?? 'No registrado'}`, 'Resumen de demostración',
      ...h.cursos.flatMap(c => [c.titulo, c.estado, `Asistencia: ${c.asistencia.porcentaje ?? '-'}%`, ...c.sesiones.map(s => `${s.fecha} | ${s.titulo} | ${s.estado}`), ...c.certificados.map(cert => `Certificado: ${cert.codigo}`)]),
      'Otras sesiones', ...h.sesionesIndependientes.map(s => `${s.fecha} | ${s.titulo} | ${s.estado}`)]
    return pdf(pdfTextoDemo('Historial de capacitación', lineas), 'historial-capacitacion.pdf')
  }),
  http.get(`${API}/colegiados/:usuarioId/certificados/:certificadoId/archivo`, ({ request, params }) => {
    const auth = acceso(request, String(params.usuarioId)); if (auth.error) return auth.error
    const h = historialDe(auth.persona!.id)
    if (!h.cursos.some(c => c.certificados.some(cert => cert.id === params.certificadoId))) return fallo(404, 'El certificado no existe en este historial.')
    return pdf(pdfTextoDemo('Certificado de demostración', ['DEMO - SIN VALIDEZ OFICIAL', h.colegiado.nombre, `DNI: ${h.colegiado.dniEnmascarado}`]), 'certificado.pdf')
  }),
]
