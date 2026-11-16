/** Intervalo en segundos (epoch o relativos); `fin` es exclusivo. */
export type Intervalo = { inicio: number; fin: number };

/**
 * Tiempo conectado de una persona dentro de la duración de referencia de la reunión.
 * Une las conexiones simultáneas (varias pestañas o reconexiones) para no contarlas dos veces.
 */
export function calcularAsistenciaVirtual(conexiones: Intervalo[], referencia: Intervalo, porcentajeMinimo: number) {
  const duracion = referencia.fin - referencia.inicio;
  const recortados = conexiones
    .map(({ inicio, fin }) => ({ inicio: Math.max(inicio, referencia.inicio), fin: Math.min(fin, referencia.fin) }))
    .filter(({ inicio, fin }) => fin > inicio)
    .sort((primero, segundo) => primero.inicio - segundo.inicio);
  let segundosConectados = 0;
  let tramo: Intervalo | undefined;
  for (const intervalo of recortados) {
    if (tramo && intervalo.inicio <= tramo.fin) { tramo.fin = Math.max(tramo.fin, intervalo.fin); continue; }
    if (tramo) segundosConectados += tramo.fin - tramo.inicio;
    tramo = { ...intervalo };
  }
  if (tramo) segundosConectados += tramo.fin - tramo.inicio;
  if (duracion <= 0) return { segundosConectados: 0, porcentaje: 0, cuenta: false };
  const porcentaje = Math.round(segundosConectados * 10000 / duracion) / 100;
  return { segundosConectados, porcentaje, cuenta: segundosConectados > 0 && segundosConectados * 100 >= duracion * porcentajeMinimo };
}
