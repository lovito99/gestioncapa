import type { FastifyInstance } from 'fastify';
import { pool } from '../../shared/database.js';

/** Protege las sesiones también cuando se accede a ellas por las rutas de clases. */
export function registrarAccesoSesiones(app: FastifyInstance) {
  app.addHook('onRoute', opciones => {
    if (!opciones.url.startsWith('/api/clases/:id')) return;
    opciones.preHandler = [...[opciones.preHandler ?? []].flat(), async (request, reply) => {
      const { id } = request.params as { id: string };
      if (!/^\d{1,15}$/.test(id) || Number(id) <= 0) return;
      const curso = (await pool.query<{ permitido: boolean; instructorId: string }>(`select
        c.organization_id=u.organization_id as permitido,c.instructor_id::text as "instructorId"
        from classes s join cursos c on c.id=s.curso_id
        join users u on u.id=$2 where s.id=$1`, [id, request.usuario!.id])).rows[0];
      if (!curso) return; // Las clases anteriores conservan su contrato.
      if (!curso.permitido || (request.usuario!.role === 'instructor' && curso.instructorId !== String(request.usuario!.id))) {
        return reply.code(403).send({ code: 'SIN_PERMISO', message: 'No tienes permiso para acceder a esta sesión.' });
      }
      if (request.method === 'POST' && opciones.url.endsWith('/inscritos')) {
        const cuerpo = request.body as { email?: unknown } | null;
        if (typeof cuerpo?.email === 'string') {
          const participante = (await pool.query<{ permitido: boolean }>(`select p.organization_id=a.organization_id as permitido
            from users p join users a on a.id=$2 where p.email=lower(trim($1)) and p.role='participante' and p.active`,
          [cuerpo.email, request.usuario!.id])).rows[0];
          if (participante && !participante.permitido) {
            return reply.code(403).send({ code: 'SIN_PERMISO', message: 'El participante debe pertenecer a la organización del curso.' });
          }
        }
      }
      if (request.method === 'PUT') {
        const cuerpo = request.body as { instructorId?: unknown } | null;
        if (String(cuerpo?.instructorId) !== curso.instructorId) {
          return reply.code(422).send({ code: 'VALIDACION', message: 'La sesión debe conservar el instructor del curso.', fields: { instructorId: 'Selecciona el instructor asignado al curso.' } });
        }
      }
    }];
  });
}
