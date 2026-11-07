export type SesionHistorial = {
  id: string; cursoId: string | null; titulo: string; fecha: string; horaInicio: string; horaFin: string;
  estado: 'PRESENTE' | 'AUSENTE' | 'PENDIENTE' | 'CANCELADA'; contabiliza: boolean; horaRegistro: string | null;
};
export type ResumenAsistencia = { presentes: number; realizadas: number; porcentaje: number | null };
export type CertificadoHistorial = { id: string; cursoId: string; codigo: string; tipo: 'PARTICIPACION' | 'APROBACION'; emitidoEn: string };
export type CursoHistorial = {
  id: string; titulo: string; estado: 'EN_CURSO' | 'TERMINADO'; horasLectivas: number; modalidad: string;
  inscritoEn: string; terminadoEn: string | null; sesiones: SesionHistorial[];
  asistencia: ResumenAsistencia; certificados: CertificadoHistorial[];
};
export type Historial = {
  colegiado: { id: string; nombre: string; dniEnmascarado: string | null }; generadoEn: string;
  cursos: CursoHistorial[]; sesionesIndependientes: SesionHistorial[]; asistenciaGeneral: ResumenAsistencia;
};
export function ocultarDni(dni: string | null) { return dni && /^\d{8}$/.test(dni) ? `****${dni.slice(-4)}` : null; }
export function resumirAsistencia(sesiones: SesionHistorial[]): ResumenAsistencia {
  const realizadas = sesiones.filter(s => s.contabiliza);
  const presentes = realizadas.filter(s => s.estado === 'PRESENTE').length;
  return { presentes, realizadas: realizadas.length, porcentaje: realizadas.length ? Math.round(presentes * 10000 / realizadas.length) / 100 : null };
}
