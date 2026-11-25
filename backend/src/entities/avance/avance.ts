import type { ModalidadCurso } from '../cursos/modalidad.js';

export type CursoAvance = {
  id: string;
  titulo: string;
  modalidad: ModalidadCurso;
  estado: 'BORRADOR' | 'PUBLICADO' | 'CERRADO';
  instructorId: string;
  medido: boolean;
};

export type MaterialAvance = {
  id: string;
  moduloId: string;
  modulo: string;
  titulo: string;
  tipo: 'VIDEO' | 'PDF' | 'ENLACE';
  url: string | null;
  obligatorio: boolean;
  duracionMs: number | null;
  version: number;
};

export type ProgresoUnidad = { vistoMs: number; posicionMs: number; completadaEn: Date | null };
export type UnidadAvance = MaterialAvance & ProgresoUnidad;
export type ConfiguracionUnidad = Pick<MaterialAvance, 'obligatorio' | 'duracionMs'>;

export function resumirAvance(curso: CursoAvance, unidades: UnidadAvance[]) {
  const obligatorias = unidades.filter(unidad => unidad.obligatorio);
  let visto = 0;
  let total = 0;
  for (const unidad of obligatorias) {
    if (curso.modalidad === 'GRABADO') {
      if (unidad.tipo !== 'VIDEO' || unidad.duracionMs === null) continue;
      total += unidad.duracionMs;
      visto += Math.min(unidad.duracionMs, unidad.vistoMs);
    } else {
      total++;
      if (unidad.completadaEn) visto++;
    }
  }

  return {
    titulo: curso.titulo, modalidad: curso.modalidad, medido: curso.medido,
    porcentaje: total ? Math.floor(visto * 10000 / total) / 100 : 0,
    obligatorias: obligatorias.length,
    completadas: obligatorias.filter(unidad => unidad.completadaEn !== null).length,
    unidades
  };
}

export type ReporteReproduccion = {
  sesionId: string;
  secuencia: number;
  desdeMs: number;
  hastaMs: number;
  posicionMs: number;
};

export function intervaloAcreditable(
  reporte: ReporteReproduccion,
  duracionMs: number,
  vistoMs: number,
  tiempo: { desdeInicioMs: number; desdeReporteMs: number; inicioAcreditadoMs: number }
) {
  const { desdeMs, hastaMs, posicionMs } = reporte;
  const limite = Math.max(vistoMs, hastaMs);
  const nuevoMs = limite - vistoMs;
  if (desdeMs > vistoMs || limite > duracionMs || posicionMs > limite) return null;
  // El margen entre reportes absorbe variación de red sin acreditar más que el tiempo total de la sesión.
  if (nuevoMs > tiempo.desdeReporteMs + 250 || limite - tiempo.inicioAcreditadoMs > tiempo.desdeInicioMs) return null;
  return limite;
}

export function alcanzaUmbral(vistoMs: number, duracionMs: number) {
  return vistoMs * 10 >= duracionMs * 9;
}
