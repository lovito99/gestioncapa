/** Ilustraciones de respaldo de la portada (Figma S3 3.1); las usan la web y la vista previa social. */
export const fondosPortada = ['vino', 'verde', 'dorado', 'azul', 'morado', 'rojo'] as const
export type FondoPortada = (typeof fondosPortada)[number]

/**
 * Imagen por defecto de cada categoría. Pendiente de confirmar con Diseño la asignación
 * de las categorías que el Figma no muestra; las desconocidas usan la de General.
 */
const fondoPorCategoria: Record<string, FondoPortada> = {
  Evaluación: 'vino',
  Educación: 'verde',
  'Educación inclusiva': 'verde',
  Didáctica: 'dorado',
  Planificación: 'dorado',
  Tecnología: 'azul',
  'Tecnología educativa': 'azul',
  'Gestión escolar': 'morado',
  Tutoría: 'morado',
  'Seguridad y salud': 'rojo',
  Comprensión: 'rojo',
  General: 'vino',
}

export const fondoDeCategoria = (categoria: string): FondoPortada =>
  Object.hasOwn(fondoPorCategoria, categoria) ? fondoPorCategoria[categoria]! : fondoPorCategoria.General!

/** Versión raster 1280 × 720 servida desde `public/` para Open Graph. */
export const rutaPortadaSocial = (categoria: string) => `/portadas/${fondoDeCategoria(categoria)}.jpg`
