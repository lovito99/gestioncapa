import type { Curso, DetalleCurso, ModalidadCobro, PoliticaCobro, PortadaEntrada } from '@/servicios/cursos'

/** Reglas y formatos de cursos del Sprint 3 (cobro, precios y portada), sin componentes. */

/** Cobro efectivo del curso: los antiguos sin modalidad se leen por su costo. */
export const modalidadCobroDe = (curso: Pick<Curso, 'modalidadCobro' | 'costo'>): ModalidadCobro =>
  curso.modalidadCobro ?? (curso.costo === 0 ? 'GRATUITO' : 'PREVIO')

export const TEXTO_COBRO: Record<ModalidadCobro, string> = { PREVIO: 'Pago antes del curso', CERTIFICADO: 'Pagas solo el certificado', GRATUITO: 'Gratuito' }


export const soles = (importe: number) => `S/ ${importe.toFixed(2)}`
/** Precio para externos: los cursos anteriores a SCRUM-190 tienen un solo precio. */
export const precioGeneralDe = (curso: Pick<Curso, 'costo' | 'precioGeneral'>) => curso.precioGeneral ?? curso.costo

/** Plazo de pago legible: «3 días», «12 horas» o «45 minutos». */
export function textoPlazo(minutos: number) {
  if (minutos % 1440 === 0) return minutos === 1440 ? '1 día' : `${minutos / 1440} días`
  if (minutos % 60 === 0) return minutos === 60 ? '1 hora' : `${minutos / 60} horas`
  return `${minutos} minutos`
}

/** Precio que le toca a quien consulta: el del padrón si el backend lo envía, si no el de colegiado. */
export function precioPara(curso: DetalleCurso) {
  const general = precioGeneralDe(curso)
  const mio = curso.miPrecio
  if (mio) return { ...mio, otro: mio.tipo === 'COLEGIADO' ? general : curso.costo }
  return { tipo: 'COLEGIADO' as const, importe: curso.costo, dniParcial: null, enPadron: true, otro: general }
}

/**
 * `precioGeneral` solo viaja si difiere del de colegiado: el backend actual valida en modo estricto
 * y lo rechazaría hasta implementar SCRUM-191. Con precios iguales, el cuerpo es el de siempre.
 */
export function precioGeneralParaEnviar(cobro: Pick<PoliticaCobro, 'modalidadCobro' | 'costo' | 'precioGeneral'>) {
  if (cobro.modalidadCobro === 'GRATUITO' || cobro.precioGeneral === cobro.costo) return {}
  return { precioGeneral: cobro.precioGeneral }
}

export type ErroresCobro = Partial<Record<keyof PoliticaCobro, string>>

/** Valida la sección «Cobro» con los mensajes del Figma S3 2.1. */
export function validarCobro(valor: PoliticaCobro): ErroresCobro {
  const errores: ErroresCobro = {}
  if (!valor.modalidadCobro) errores.modalidadCobro = 'Elige cuándo paga el participante.'
  if (valor.modalidadCobro && valor.modalidadCobro !== 'GRATUITO') {
    const valido = (n: number) => Number.isFinite(n) && n > 0 && Math.round(n * 100) === n * 100
    if (!valido(valor.costo)) errores.costo = 'Ingresa el precio para colegiados, mayor que cero y con hasta dos decimales.'
    if (!valido(valor.precioGeneral)) errores.precioGeneral = 'Ingresa el precio general. Si es igual al de colegiados, repite el monto.'
  }
  if (valor.modalidadCobro === 'PREVIO' && !valor.plazoPagoMinutos) errores.plazoPagoMinutos = 'Elige el plazo para pagar.'
  return errores
}

/** Tamaño máximo de la portada (SCRUM-182). */
export const MAXIMO_PORTADA = 1024 * 1024
const TIPOS: Record<string, { tipo: PortadaEntrada['tipo']; nombre: string }> = {
  'image/jpeg': { tipo: 'image/jpeg', nombre: 'JPG' },
  'image/png': { tipo: 'image/png', nombre: 'PNG' },
  'image/webp': { tipo: 'image/webp', nombre: 'WebP' },
}

/** Lo que el formulario debe hacer con la portada al guardar. */
export type CambioPortada =
  | { tipo: 'sin-cambios' }
  | { tipo: 'nueva'; entrada: PortadaEntrada; vistaPrevia: string; detalle: string }
  | { tipo: 'quitar' }

const megas = (bytes: number) => (bytes / 1024 / 1024).toLocaleString('es-PE', { maximumFractionDigits: 1 })
const kilos = (bytes: number) => `${Math.round(bytes / 1024)} KB`

function leer(archivo: File): Promise<{ dataUrl: string; ancho: number; alto: number }> {
  return new Promise((resolve, reject) => {
    const lector = new FileReader()
    lector.onerror = () => reject(new Error(`No pudimos leer «${archivo.name}». Elígela de nuevo.`))
    lector.onload = () => {
      const dataUrl = String(lector.result)
      const imagen = new Image()
      imagen.onload = () => resolve({ dataUrl, ancho: imagen.naturalWidth, alto: imagen.naturalHeight })
      imagen.onerror = () => reject(new Error(`«${archivo.name}» no parece una imagen válida.`))
      imagen.src = dataUrl
    }
    lector.readAsDataURL(archivo)
  })
}

/** Valida y prepara la imagen elegida; devuelve el mensaje de error del Figma si no sirve. */
export async function prepararPortada(archivo: File): Promise<CambioPortada & { tipo: 'nueva' }> {
  const tipo = TIPOS[archivo.type]
  if (!tipo) throw new Error(`«${archivo.name}» no es JPG, PNG ni WebP. Elige una imagen en uno de esos formatos.`)
  if (archivo.size > MAXIMO_PORTADA) throw new Error(`«${archivo.name}» pesa ${megas(archivo.size)} MB. Reduce su tamaño a 1 MB o menos e inténtalo otra vez.`)
  const { dataUrl, ancho, alto } = await leer(archivo)
  const proporcion = Math.abs(ancho / alto - 16 / 9) < 0.02 ? '(16:9)' : '(se recortará a 16:9)'
  return {
    tipo: 'nueva',
    entrada: { nombre: archivo.name, tipo: tipo.tipo, contenidoBase64: dataUrl.split(',')[1] ?? '' },
    vistaPrevia: dataUrl,
    detalle: `${tipo.nombre} · ${kilos(archivo.size)} · ${ancho} × ${alto} px ${proporcion}`,
  }
}

