import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { pool } from '../../shared/database.js';
import { crearCurso, guardarMaterial, inscribirseEnCurso, paginaCatalogo, listarCursos, obtenerArchivo, obtenerCurso, organizacionUsuario, publicarCurso } from './cursos.repositorio.js';
import { esquemaCurso, esquemaMaterial, esquemaConsultaCatalogo, idCurso } from './cursos.validacion.js';

type ConId = FastifyRequest<{ Params: { id: string; moduloId?: string; materialId?: string } }>;
const error = (reply: FastifyReply, status: number, code: string, message: string) => reply.code(status).send({ code, message });

async function cursoAutorizado(request: ConId, reply: FastifyReply) {
  if (!idCurso.safeParse(request.params.id).success) {
    await error(reply, 404, 'CURSO_NO_EXISTE', 'El curso no existe.'); return null;
  }
  const curso = await obtenerCurso(request.params.id, request.usuario!.id);
  if (!curso) { await error(reply, 404, 'CURSO_NO_EXISTE', 'El curso no existe.'); return null; }
  const usuario = request.usuario!;
  const organizacion = await organizacionUsuario(usuario.id);
  if (curso.organizacionId !== organizacion || (curso.estado === 'BORRADOR' && usuario.role !== 'admin' && curso.instructorId !== String(usuario.id))) {
    await error(reply, 403, 'SIN_PERMISO', 'No tienes permiso para acceder a este curso.'); return null;
  }
  return curso;
}

export async function registrarCursos(app: FastifyInstance) {
  app.get('/api/cursos/instructores', async request => {
    const organizacion = await organizacionUsuario(request.usuario!.id);
    return (await pool.query(`select id::text,name as nombre from users where organization_id=$1 and role='instructor' and active order by name`, [organizacion])).rows;
  });
  app.get('/api/cursos', async request => {
    const usuario = request.usuario!;
    const organizacion = await organizacionUsuario(usuario.id);
    return listarCursos(organizacion!, usuario.role === 'instructor' ? usuario.id : undefined);
  });
  app.get('/api/catalogo/cursos', async request => listarCursos((await organizacionUsuario(request.usuario!.id))!, undefined, true));
  app.get('/api/catalogo/cursos/pagina', async (request, reply) => {
    reply.header('Cache-Control', 'private, no-store');
    const consulta = esquemaConsultaCatalogo.parse(request.query);
    return paginaCatalogo((await organizacionUsuario(request.usuario!.id))!, request.usuario!.id, consulta);
  });
  app.post('/api/cursos/:id/inscribirme', async (request: ConId, reply) => {
    if (!idCurso.safeParse(request.params.id).success) return error(reply, 404, 'CURSO_NO_EXISTE', 'El curso no existe.');
    const resultado = await inscribirseEnCurso(request.params.id, request.usuario!.id);
    if (resultado === 'NO_EXISTE') return error(reply, 404, 'CURSO_NO_EXISTE', 'El curso no existe.');
    if (resultado === 'SIN_PERMISO') return error(reply, 403, 'SIN_PERMISO', 'No tienes permiso para inscribirte en este curso.');
    if (resultado === 'NO_PUBLICADO') return error(reply, 409, 'CURSO_NO_PUBLICADO', 'El curso no está publicado.');
    if (resultado === 'SIN_CUPOS') return error(reply, 409, 'SIN_CUPOS', 'El curso está sin cupos. Elige otra capacitación.');
    return reply.code(resultado === 'INSCRITO' ? 201 : 200).send({ cursoId: request.params.id, estado: resultado === 'YA_TERMINADO' ? 'TERMINADO' : 'EN_CURSO', yaInscrito: resultado !== 'INSCRITO' });
  });
  app.post('/api/cursos', async (request, reply) => {
    const datos = esquemaCurso.parse(request.body);
    const organizacion = await organizacionUsuario(request.usuario!.id);
    const id = await crearCurso(datos, request.usuario!.id, organizacion!);
    if (!id) return reply.code(422).send({ code: 'VALIDACION', message: 'Selecciona un instructor activo de tu organización.', fields: { instructorId: 'El instructor no está disponible.' } });
    return reply.code(201).send(await obtenerCurso(id));
  });
  app.get('/api/cursos/:id', async (request: ConId, reply) => await cursoAutorizado(request, reply) ?? reply);
  app.post('/api/cursos/:id/publicar', async (request: ConId, reply) => {
    const curso = await cursoAutorizado(request, reply);
    if (!curso) return reply;
    if (!await publicarCurso(curso.id, curso.organizacionId)) return error(reply, 409, 'CURSO_INCOMPLETO', 'Agrega horas lectivas y módulos antes de publicar.');
    return obtenerCurso(curso.id);
  });
  app.post('/api/cursos/:id/modulos/:moduloId/materiales', { bodyLimit: 8 * 1024 * 1024 }, async (request: ConId, reply) => {
    const curso = await cursoAutorizado(request, reply);
    if (!curso) return reply;
    if (curso.instructorId !== String(request.usuario!.id)) return error(reply, 403, 'SIN_PERMISO', 'Solo el instructor asignado puede agregar material a este curso.');
    if (!idCurso.safeParse(request.params.moduloId).success || !curso.modulos.some(m => m.id === request.params.moduloId)) return error(reply, 404, 'MODULO_NO_EXISTE', 'El módulo no pertenece a este curso.');
    const datos = esquemaMaterial.parse(request.body);
    const material = await guardarMaterial(curso.id, request.params.moduloId!, request.usuario!.id, curso.organizacionId, datos);
    if (!material) return error(reply, 403, 'SIN_PERMISO', 'No tienes permiso para agregar material a este módulo.');
    return reply.code(201).send({ ...material, titulo: datos.titulo, tipo: datos.tipo, url: datos.tipo === 'PDF' ? null : datos.url });
  });
  app.get('/api/cursos/:id/modulos/:moduloId/materiales/:materialId/archivo', async (request: ConId, reply) => {
    const curso = await cursoAutorizado(request, reply);
    if (!curso) return reply;
    if (!idCurso.safeParse(request.params.moduloId).success || !idCurso.safeParse(request.params.materialId).success) return error(reply, 404, 'MATERIAL_NO_EXISTE', 'El archivo no existe.');
    const archivo = await obtenerArchivo(curso.id, request.params.moduloId!, request.params.materialId!);
    if (!archivo) return error(reply, 404, 'MATERIAL_NO_EXISTE', 'El archivo no existe en este módulo.');
    return reply.header('Cache-Control', 'private, no-store').header('Content-Disposition', 'attachment; filename="material.pdf"').type('application/pdf').send(archivo);
  });
}
