export type SesionHistorial = {
  id: string; cursoId: string | null; titulo: string; fecha: string; horaInicio: string; horaFin: string;
  estado: 'PRESENTE' | 'AUSENTE' | 'PENDIENTE' | 'CANCELADA'; contabiliza: boolean; horaRegistro: string | null;
};
export type ResumenAsistencia = { presentes: number; realizadas: number; porcentaje: number | null };
export type CertificadoHistorial = { id: string; cursoId: string; codigo: string; tipo: 'PARTICIPACION' | 'APROBACION'; emitidoEn: string; horasLectivas: number; estado: 'VALIDO' | 'ANULADO' | 'REEMPLAZADO' };
export type CursoHistorial = {
  id: string; titulo: string; estado: 'EN_CURSO' | 'TERMINADO' | 'PENDIENTE_PAGO'; horasLectivas: number; modalidad: string;
  pagoPendiente: boolean; inscritoEn: string; terminadoEn: string | null; sesiones: SesionHistorial[];
  asistencia: ResumenAsistencia; certificados: CertificadoHistorial[];
};
export type Historial = {
  colegiado: { id: string; nombre: string; dniEnmascarado: string | null }; generadoEn: string;
  horasAcumuladas: ResumenHoras; cursos: CursoHistorial[]; sesionesIndependientes: SesionHistorial[]; asistenciaGeneral: ResumenAsistencia;
};
export function ocultarDni(dni: string | null) { return dni && /^\d{8}$/.test(dni) ? `****${dni.slice(-4)}` : null; }
export function resumirAsistencia(sesiones: SesionHistorial[]): ResumenAsistencia {
  const realizadas = sesiones.filter(s => s.contabiliza);
  const presentes = realizadas.filter(s => s.estado === 'PRESENTE').length;
  return { presentes, realizadas: realizadas.length, porcentaje: realizadas.length ? Math.round(presentes * 10000 / realizadas.length) / 100 : null };
}

export type ResumenHoras = { total: number; porAnio: { anio: string; horas: number }[] };
/** El año corresponde a la fecha de emisión en Perú, no a la fecha del curso. */
export function resumirHoras(certificados: Pick<CertificadoHistorial, 'estado' | 'horasLectivas' | 'emitidoEn'>[]): ResumenHoras {
  const porAnio = new Map<string, number>();
  const formato = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima', year: 'numeric' });
  let total = 0;
  for (const certificado of certificados) {
    if (certificado.estado !== 'VALIDO') continue;
    const anio = formato.format(new Date(certificado.emitidoEn));
    total += certificado.horasLectivas;
    porAnio.set(anio, (porAnio.get(anio) ?? 0) + certificado.horasLectivas);
  }
  return { total, porAnio: [...porAnio].sort(([a], [b]) => b.localeCompare(a)).map(([anio, horas]) => ({ anio, horas })) };
}
