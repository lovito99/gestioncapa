export const esIdCursoPublico = (id: string) => /^[1-9]\d{0,14}$/.test(id)
export const rutaCortaCurso = (id: string) => `/c/${id}`

export function normalizarOrigenCurso(valor: string) {
  try {
    const url = new URL(valor)
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
    if (url.protocol !== 'https:' && !(local && url.protocol === 'http:')) return null
    if (url.username || url.password || url.href !== `${url.origin}/`) return null
    return url.origin
  } catch {
    return null
  }
}

type FechasPublicas = { fechaInicio: string | null; fechaFin: string | null }
type CobroPublico = { costo: number; modalidadCobro?: string | null }

export function fechaPublicaCurso({ fechaInicio, fechaFin }: FechasPublicas) {
  const formatear = (fecha: string) => fecha.split('-').reverse().join('/')
  if (fechaInicio && fechaFin) {
    return fechaInicio === fechaFin ? formatear(fechaInicio) : `${formatear(fechaInicio)} al ${formatear(fechaFin)}`
  }
  if (fechaInicio) return `Inicio: ${formatear(fechaInicio)}`
  if (fechaFin) return `Fin: ${formatear(fechaFin)}`
  return 'Fechas por confirmar'
}

export function costoPublicoCurso({ costo, modalidadCobro }: CobroPublico) {
  const importe = `S/ ${costo.toFixed(2)}`
  if (modalidadCobro === 'CERTIFICADO') return `Curso gratuito · Constancia: ${importe}`
  if (modalidadCobro === 'GRATUITO' || (!modalidadCobro && costo === 0)) return 'Gratuito'
  if (modalidadCobro === 'PREVIO') return `Curso: ${importe}`
  return `${importe} · Condiciones de cobro por configurar`
}
