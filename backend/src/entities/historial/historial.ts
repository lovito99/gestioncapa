export type SesionHistorial = {
  id: string; cursoId: string | null; titulo: string; fecha: string; horaInicio: string; horaFin: string;
  estado: 'PRESENTE' | 'AUSENTE' | 'PENDIENTE' | 'CANCELADA'; contabiliza: boolean; horaRegistro: string | null;
};
export type ResumenAsistencia = { presentes: number; realizadas: number; porcentaje: number | null };
export type CertificadoHistorial = { id: string; cursoId: string; codigo: string; tipo: 'PARTICIPACION' | 'APROBACION'; emitidoEn: string; horasLectivas: number; estado: 'VALIDO' | 'ANULADO' | 'REEMPLAZADO' };
export type CursoHistorial = {
  id: string; titulo: string; estado: 'EN_CURSO' | 'TERMINADO' | 'PENDIENTE_PAGO' | 'CANCELADA'; horasLectivas: number; modalidad: string;
  pagoId?:string|null;estadoEntrega?:'RETENIDA'|'EMITIDA'|null;modalidadCobro?:string|null;importeCentimos?:number|null;
  venceEn?:string|null;estadoFinanciero?:string;
  intentosAnteriores?: {intentoId:string;estado:string;modalidadCobro:string;importeCentimos:number;inscritoEn:string;venceEn:string|null;pagoId:string|null;estadoFinanciero:string}[];
  pagoPendiente: boolean; inscritoEn: string; terminadoEn: string | null; sesiones: SesionHistorial[];
  asistencia: ResumenAsistencia; certificados: CertificadoHistorial[];
};
export type Historial = {
  colegiado: { id: string; nombre: string; dniEnmascarado: string | null }; generadoEn: string;
  horasAcumuladas: ResumenHoras; cursos: CursoHistorial[]; sesionesIndependientes: SesionHistorial[]; asistenciaGeneral: ResumenAsistencia;
};
export type ResumenHoras = { total: number; porAnio: { anio: string; horas: number }[] };
export type Colegiado = Historial["colegiado"];
