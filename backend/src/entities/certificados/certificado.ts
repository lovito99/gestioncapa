export type DatosDocumento = {
  nombre: string; dniEnmascarado: string | null; curso: string; modalidad: string;
  horasLectivas: number; fechaInicio: string | null; fechaFin: string | null; instructorNombre: string;
  tipo: 'PARTICIPACION' | 'APROBACION'; demo: boolean;
};
export type FilaCierre = { agremiado: { id: string; nombre: string }; presentes: number; sesiones: number; porcentaje: number; cumple: boolean };
export type CursoEmision = { id: string; estado: string; titulo: string; modalidad: string; costo: number; modalidadCobro?: string | null; tipoCertificado: string; horasLectivas: number; instructorNombre: string };
export type RegistroCertificado = { id: string; cursoId: string; usuarioId: string; estado: string; codigo: string; reemplazadoPor: string | null; emitidoEn: string; datos: DatosDocumento; archivo: Buffer | null };

/** Requisito vigente del CPPP: asistir al 80 % de las sesiones programadas del curso. */
export const requisitoAsistencia = 80;

export function aFilaCierre(fila: { id: string; nombre: string; presentes: number; sesiones: number }): FilaCierre {
  return { agremiado: { id: fila.id, nombre: fila.nombre }, presentes: fila.presentes, sesiones: fila.sesiones,
    porcentaje: fila.sesiones ? Math.round(fila.presentes * 10000 / fila.sesiones) / 100 : 0,
    cumple: fila.sesiones > 0 && fila.presentes * 100 >= fila.sesiones * requisitoAsistencia };
}
