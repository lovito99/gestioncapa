import type { PoolClient } from 'pg';
import type { TipoCorreo } from '../../entities/notificaciones/correo.js';

type EventoCurso = {
  cursoId: string;
  eventoId: string;
  detalles: string[];
} & (
  { tipo: 'CAMBIO_SESION'; usuarioId?: never }
  | { tipo: Exclude<TipoCorreo, 'CAMBIO_SESION' | 'COMPROBANTE' | 'RECHAZO'>; usuarioId: number | string }
);

export async function encolarAvisoCurso(cliente: PoolClient, evento: EventoCurso) {
  const destinatarios = evento.tipo === 'CAMBIO_SESION'
    ? `from inscripciones_curso i join users u on u.id=i.usuario_id
        where i.curso_id=$3 and i.estado='EN_CURSO' and u.active and "tieneAccesoCurso"($3,u.id)`
    : 'from users u where u.id=$5::bigint';
  const datos = [evento.tipo, evento.eventoId, evento.cursoId, JSON.stringify(evento.detalles)];
  if (evento.usuarioId !== undefined) datos.push(String(evento.usuarioId));
  await cliente.query(`insert into "notificacionesCorreo"
    (tipo,"eventoId","cursoId","usuarioId",destinatario,datos)
    select $1,$2,c.id,u.id,u.email,
      jsonb_build_object('nombre',u.name,'curso',c.titulo,'cursoId',c.id::text,'detalles',$4::jsonb)
    from cursos c join (select u.id,u.name,u.email ${destinatarios} and u.role='agremiado') u on true
    where c.id=$3 on conflict (tipo,"eventoId","usuarioId") do nothing`, datos);
}

export async function avisarInscripcionConfirmada(cliente: PoolClient, cursoId: string, usuarioId: number | string, intentoId: string) {
  await encolarAvisoCurso(cliente, {
    tipo: 'INSCRIPCION_CONFIRMADA', cursoId, usuarioId, eventoId: intentoId,
    detalles: ['Tu inscripción está confirmada. En el curso encontrarás sus horarios y materiales disponibles.'],
  });
}
