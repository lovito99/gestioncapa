import type { CertificadoHistorial, ResumenAsistencia, ResumenHoras, SesionHistorial } from "../../entities/historial/historial.js";

export function ocultarDni(dni: string | null) { return dni && /^\d{8}$/.test(dni) ? `****${dni.slice(-4)}` : null; }
export function resumirAsistencia(sesiones: SesionHistorial[]): ResumenAsistencia {
  const realizadas = sesiones.filter(s => s.contabiliza);
  const presentes = realizadas.filter(s => s.estado === 'PRESENTE').length;
  return { presentes, realizadas: realizadas.length, porcentaje: realizadas.length ? Math.round(presentes * 10000 / realizadas.length) / 100 : null };
}

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
