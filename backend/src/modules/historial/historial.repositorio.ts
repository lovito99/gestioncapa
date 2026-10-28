import { pool } from '../../shared/database.js';
import type { UsuarioAutenticado } from '../../plugins/autorizacion.js';
import { ocultarDni, resumirAsistencia, type CertificadoHistorial, type CursoHistorial, type Historial, type SesionHistorial } from './historial.modelo.js';

export class ErrorHistorial extends Error {
  constructor(readonly status: 403 | 404, mensaje: string) { super(mensaje); }
}
/** Comprueba el objeto antes de leer cursos, asistencias o archivos; misma organización. */
async function autorizar(consultor: Pick<typeof pool, 'query'>, actor: UsuarioAutenticado, usuarioId: string) {
  if (!['admin', 'participante'].includes(actor.role) || (actor.role !== 'admin' && String(actor.id) !== usuarioId)) throw new ErrorHistorial(403, 'No tienes permiso para ver el historial de otro colegiado.');
  const persona = (await consultor.query<{ id: string; nombre: string; dni: string | null; mismaOrganizacion: boolean; role: string }>(`
    select u.id::text,u.name as nombre,u.dni,u.role,u.organization_id=a.organization_id as "mismaOrganizacion"
    from users u join users a on a.id=$2 where u.id=$1`, [usuarioId, actor.id])).rows[0];
  if (!persona) throw new ErrorHistorial(404, 'El colegiado no existe.');
  if (!persona.mismaOrganizacion) throw new ErrorHistorial(403, 'No tienes permiso para ver este historial.');
  if (persona.role !== 'participante') throw new ErrorHistorial(404, 'El usuario no es un colegiado.');
  return { id: persona.id, nombre: persona.nombre, dniEnmascarado: ocultarDni(persona.dni) };
}
export async function listarColegiados(actor: UsuarioAutenticado) {
  return (await pool.query<{ id: string; nombre: string; dni: string | null }>(`select u.id::text,u.name as nombre,u.dni from users u
    join users a on a.id=$1 and a.organization_id=u.organization_id where u.role='participante' order by u.name,u.id`, [actor.id])).rows.map(p => ({ id: p.id, nombre: p.nombre, dniEnmascarado: ocultarDni(p.dni) }));
}
export async function obtenerHistorial(actor: UsuarioAutenticado, usuarioId: string): Promise<Historial> {
  const cliente = await pool.connect();
  try {
    await cliente.query('begin isolation level repeatable read read only');
    const colegiado = await autorizar(cliente, actor, usuarioId);
    const cursos = (await cliente.query<Omit<CursoHistorial, 'sesiones' | 'asistencia' | 'certificados'>>(`
      select c.id::text,c.titulo,i.estado,c.horas_lectivas as "horasLectivas",c.modalidad,
        to_char(i.inscrito_en at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS"Z"') as "inscritoEn",to_char(i.terminado_en at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS"Z"') as "terminadoEn"
      from inscripciones_curso i join cursos c on c.id=i.curso_id join users u on u.id=i.usuario_id and u.organization_id=c.organization_id
      where i.usuario_id=$1 order by i.inscrito_en desc,c.id desc`, [usuarioId])).rows;
    const sesiones = (await cliente.query<SesionHistorial>(`
      select s.id::text,s.curso_id::text as "cursoId",s.nombre as titulo,to_char(s.fecha,'YYYY-MM-DD') as fecha,
        to_char(s.hora_inicio,'HH24:MI') as "horaInicio",to_char(s.hora_fin,'HH24:MI') as "horaFin",
        (s.estado <> 'CANCELADA' and s.fecha+s.hora_inicio <= (now() at time zone 'America/Lima')) as contabiliza,
        case when s.estado='CANCELADA' then 'CANCELADA' when a.id is not null then 'PRESENTE'
          when s.fecha+s.hora_inicio > (now() at time zone 'America/Lima') then 'PENDIENTE' else 'AUSENTE' end as estado,
        to_char(a.timestamp_lima,'YYYY-MM-DD"T"HH24:MI:SS"-05:00"') as "horaRegistro"
      from classes s join users u on u.id=$1 and s.organization_id=u.organization_id
      left join attendances a on a.class_id=s.id and a.user_id=u.id
      where (s.curso_id=any($2::bigint[]) or exists(select 1 from enrollments e where e.class_id=s.id and e.user_id=u.id))
      order by s.fecha,s.hora_inicio,s.id`, [usuarioId, cursos.map(c => c.id)])).rows;
    const certificados = (await cliente.query<CertificadoHistorial>(`select id::text,curso_id::text as "cursoId",codigo,tipo,to_char(emitido_en at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS"Z"') as "emitidoEn"
      from certificados_curso where usuario_id=$1 and curso_id=any($2::bigint[]) order by emitido_en desc,id desc`, [usuarioId, cursos.map(c => c.id)])).rows;
    const historial: Historial = { colegiado, generadoEn: new Date().toISOString(),
      cursos: cursos.map(curso => {
        const propias = sesiones.filter(s => s.cursoId === curso.id);
        return { ...curso, sesiones: propias, asistencia: resumirAsistencia(propias), certificados: certificados.filter(c => c.cursoId === curso.id) };
      }), sesionesIndependientes: sesiones.filter(s => !s.cursoId || !cursos.some(c => c.id === s.cursoId)), asistenciaGeneral: resumirAsistencia(sesiones) };
    await cliente.query('commit'); return historial;
  } catch (error) { await cliente.query('rollback'); throw error; }
  finally { cliente.release(); }
}
export async function descargarCertificado(actor: UsuarioAutenticado, usuarioId: string, certificadoId: string) {
  // La consulta del archivo también verifica al propietario y la organización.
  await autorizar(pool, actor, usuarioId);
  const certificado = (await pool.query<{ archivo: Buffer }>(`select cert.archivo from certificados_curso cert
    join cursos c on c.id=cert.curso_id join users u on u.id=cert.usuario_id and u.organization_id=c.organization_id
    join users a on a.id=$3 and a.organization_id=u.organization_id
    where cert.id=$1 and cert.usuario_id=$2 and (a.id=u.id or a.role='admin')`, [certificadoId, usuarioId, actor.id])).rows[0];
  if (!certificado) throw new ErrorHistorial(404, 'El certificado no existe en este historial.');
  return certificado.archivo;
}
