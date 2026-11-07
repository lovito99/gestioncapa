import type { Historial } from '@/servicios/historial'

type CursoHistorial = Historial['cursos'][number]
export type Aviso = { tono: 'exito' | 'advertencia' | 'peligro'; texto: string }

const sesiones = (n: number) => (n === 1 ? '1 sesión' : `${n} sesiones`)

/**
 * «Qué te falta» para obtener la constancia (HU-20 A.4 y criterio 2 del Sprint 2): compara la
 * asistencia con el requisito del curso. Devuelve null si ya tiene un certificado válido.
 */
export function queTeFalta(curso: CursoHistorial): Aviso | null {
  if (curso.certificados.some((c) => c.estado === 'VALIDO')) return null
  const requisito = curso.requisitoAsistencia
  const pago = curso.pagoPendiente ? ' Además, el pago del curso está pendiente: la constancia se emite cuando se confirme.' : ''

  if (curso.estado === 'TERMINADO') {
    const { porcentaje } = curso.asistencia
    if (porcentaje !== null && porcentaje < requisito) {
      return { tono: 'advertencia', texto: `No obtuviste la constancia: tu asistencia fue ${porcentaje.toLocaleString('es-PE')} % y se necesita ${requisito} %.` }
    }
    return curso.pagoPendiente
      ? { tono: 'advertencia', texto: 'Cumpliste la asistencia, pero tu constancia está retenida hasta que se confirme el pago.' }
      : null
  }

  const programadas = curso.sesiones.filter((s) => s.estado !== 'CANCELADA')
  if (programadas.length === 0) return { tono: 'advertencia', texto: `Aún no hay sesiones programadas en este curso.${pago}` }
  const presentes = programadas.filter((s) => s.estado === 'PRESENTE').length
  const restantes = programadas.filter((s) => s.estado === 'PENDIENTE').length
  const faltan = Math.max(0, Math.ceil((requisito * programadas.length) / 100) - presentes)

  if (faltan === 0) return { tono: 'exito', texto: `Ya cumples el requisito de asistencia (${requisito} %).${pago}` }
  if (faltan > restantes) {
    return {
      tono: 'peligro',
      texto: `Ya no alcanzas el ${requisito} % de asistencia: te faltarían ${sesiones(faltan)} y ${restantes === 0 ? 'ya no quedan sesiones' : restantes === 1 ? 'solo queda 1' : `solo quedan ${restantes}`}.${pago}`,
    }
  }
  return {
    tono: 'advertencia',
    texto: `Para obtener la constancia te falta asistir a ${sesiones(faltan)} más (se necesita el ${requisito} % de asistencia).${pago}`,
  }
}
