import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

const capitalizar = (texto: string) => texto.charAt(0).toUpperCase() + texto.slice(1)

/** `2026-10-12` → `Lun 12 oct` */
export function fechaCorta(fechaIso: string) {
  const texto = format(parseISO(fechaIso), 'EEE d MMM', { locale: es }).replace(/\./g, '')
  return capitalizar(texto)
}

/** `2026-10-12` → `lunes 12 de octubre` */
export function fechaLarga(fechaIso: string) {
  return format(parseISO(fechaIso), "EEEE d 'de' MMMM", { locale: es })
}

// En el Perú se escribe "setiembre", como en los certificados del Figma
const conSetiembre = (texto: string) => texto.replace('septiembre', 'setiembre')

/** `2026-10-05` o fecha-hora ISO → `5 de octubre de 2026` (fecha de Lima) */
export function fechaCompleta(fechaIso: string) {
  const dia = fechaIso.length > 10 ? new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(new Date(fechaIso)) : fechaIso
  return conSetiembre(format(parseISO(dia), "d 'de' MMMM 'de' yyyy", { locale: es }))
}

/** `2026-09-07`, `2026-09-28` → `del 7 al 28 de setiembre de 2026` (sin repetir mes ni año) */
export function rangoFechas(inicioIso: string, finIso: string) {
  const [inicio, fin] = [parseISO(inicioIso), parseISO(finIso)]
  const mismoAnio = inicio.getFullYear() === fin.getFullYear()
  const mismoMes = mismoAnio && inicio.getMonth() === fin.getMonth()
  const patronInicio = mismoMes ? 'd' : mismoAnio ? "d 'de' MMMM" : "d 'de' MMMM 'de' yyyy"
  const desde = format(inicio, patronInicio, { locale: es })
  return conSetiembre(`del ${desde} al ${format(fin, "d 'de' MMMM 'de' yyyy", { locale: es })}`)
}

/** `2026-11-16`, `2026-12-14` → `16 nov – 14 dic 2026` (el año solo se repite si cambia) */
export function rangoFechasCorto(inicioIso: string, finIso: string) {
  const [inicio, fin] = [parseISO(inicioIso), parseISO(finIso)]
  const corto = (fecha: Date, conAnio: boolean) =>
    format(fecha, conAnio ? 'd MMM yyyy' : 'd MMM', { locale: es }).replace(/\./g, '')
  return `${corto(inicio, inicio.getFullYear() !== fin.getFullYear())} – ${corto(fin, true)}`
}

/** `10:00`, `11:00` → `10:00 – 11:00` */
export function rangoHorario(inicio: string, fin: string) {
  return `${inicio} – ${fin}`
}

/** Fecha-hora ISO → `10:02` (24 h) en hora de Lima, como en las tablas de asistencia */
export function horaCorta(fechaHoraIso: string) {
  return new Intl.DateTimeFormat('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Lima' }).format(
    new Date(fechaHoraIso),
  )
}

/** Fecha-hora ISO → `10:02 a. m.` en hora de Lima */
export function horaRegistro(fechaHoraIso: string) {
  return new Intl.DateTimeFormat('es-PE', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/Lima',
  }).format(new Date(fechaHoraIso))
}
