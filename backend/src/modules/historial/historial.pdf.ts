import { crearPdfTexto } from '../../shared/pdf.js';
import type { Historial, SesionHistorial } from './historial.modelo.js';
const fecha = (iso: string) => new Intl.DateTimeFormat('es-PE', { dateStyle: 'short', timeZone: 'America/Lima' }).format(new Date(iso));
const porcentaje = (valor: number | null) => valor === null ? 'Sin sesiones realizadas' : `${valor}%`;
const sesion = (s: SesionHistorial) => `${s.fecha} ${s.horaInicio}-${s.horaFin} | ${s.titulo} | ${s.estado}${s.horaRegistro ? ` | Registro: ${s.horaRegistro}` : ''}`;
export function pdfHistorial(historial: Historial) {
  return crearPdfTexto('Historial de capacitación', [
    `Colegiado: ${historial.colegiado.nombre}`,
    `DNI: ${historial.colegiado.dniEnmascarado ?? 'No registrado'}`,
    `Generado: ${fecha(historial.generadoEn)} (hora de Lima)`, '',
    `Asistencia general: ${historial.asistenciaGeneral.presentes} de ${historial.asistenciaGeneral.realizadas} sesiones realizadas (${porcentaje(historial.asistenciaGeneral.porcentaje)})`,
    'Se excluyen sesiones futuras y canceladas del porcentaje.', '', 'CURSOS',
    ...(historial.cursos.length ? historial.cursos.flatMap(c => [
      `${c.titulo} | ${c.estado === 'EN_CURSO' ? 'En curso' : 'Terminado'} | ${c.horasLectivas} horas lectivas`,
      `Inscripción: ${fecha(c.inscritoEn)}${c.terminadoEn ? ` | Finalización: ${fecha(c.terminadoEn)}` : ''}`,
      `Asistencia: ${c.asistencia.presentes} de ${c.asistencia.realizadas} sesiones realizadas (${porcentaje(c.asistencia.porcentaje)})`,
      ...(c.sesiones.length ? c.sesiones.map(sesion) : ['Sin sesiones registradas.']),
      ...(c.certificados.length ? c.certificados.map(cert => `Certificado: ${cert.codigo} | ${cert.tipo === 'APROBACION' ? 'Aprobación' : 'Participación'} | Emitido: ${fecha(cert.emitidoEn)}`) : ['Sin certificados emitidos.']), '',
    ]) : ['No hay cursos inscritos.']),
    '', 'SESIONES INDEPENDIENTES',
    ...(historial.sesionesIndependientes.length ? historial.sesionesIndependientes.map(sesion) : ['No hay sesiones independientes.']),
    '', 'Este resumen no reemplaza los certificados emitidos.',
  ]);
}
