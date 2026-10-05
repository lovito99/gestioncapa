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

/** `10:00`, `11:00` → `10:00 – 11:00` */
export function rangoHorario(inicio: string, fin: string) {
  return `${inicio} – ${fin}`
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
