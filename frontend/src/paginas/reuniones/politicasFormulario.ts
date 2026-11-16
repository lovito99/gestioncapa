import type { PoliticasReunion } from '@/servicios/reuniones'

/** Convierte el formulario de configuración; rechaza valores que el backend también rechazaría. */
export function politicasDesdeFormulario(datos: FormData, grabacionPrevista: boolean): PoliticasReunion {
  const porcentajeMinimo = Number(datos.get('porcentajeMinimo'))
  if (!Number.isInteger(porcentajeMinimo) || porcentajeMinimo < 1 || porcentajeMinimo > 100) throw new Error('La conexión mínima debe ser un entero entre 1 y 100.')
  return {
    pantallaPermitida: datos.get('pantalla') === 'libre',
    microfonoPermitido: datos.get('microfono') === 'libre',
    camaraPermitida: datos.get('camara') === 'libre',
    manoPermitida: datos.get('manoPermitida') === 'on',
    porcentajeMinimo,
    grabacionPrevista: datos.has('grabacionPrevista') ? datos.get('grabacionPrevista') === 'on' : grabacionPrevista,
  }
}
