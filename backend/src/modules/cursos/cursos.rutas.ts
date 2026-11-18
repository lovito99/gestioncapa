import { asistenciaCurso, listarSesiones, programarSesion } from './sesiones.repositorio.js';
import { validarClase } from '../clases/clases.validacion.js';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { pool } from '../../shared/database.js';
import { actualizarCobro, crearCurso, guardarMaterial, inscribirseEnCurso, listarCursos, obtenerArchivo,
  obtenerCurso, obtenerCursoPublicado, obtenerMiInscripcion, paginaCatalogo, publicarCurso, type Curso } from './cursos.repositorio.js';
import { esquemaCurso, esquemaMaterial, esquemaConsultaCatalogo, idCurso } from './cursos.validacion.js';
import { esquemaCambioCobro } from './cursos.cobro.js';
import { entradaInscripcion } from './cursos.cobro.js';
import { puedeAccederContenido } from './cursos.acceso.js';
import { env } from '../../config/env.js';
import { origenCorreoValido } from '../notificaciones/correo.contenido.js';
import type { UsuarioAutenticado } from '../../plugins/autorizacion.js';
import { ErrorPortada, limiteCuerpoPortada, procesarPortada } from './portada.js';
import { guardarPortada, leerPortadaPrivada, leerPortadaPublica, retirarPortada, urlPortadaPrivada, variantesPortada, type VariantePortada } from './portadas.repositorio.js';
import { admiteInscripcionExterna, cotizarInscripcion, precioDelTitular } from './precioInscripcion.js';

type ConId = FastifyRequest<{ Params: { id: string; moduloId?: string; materialId?: string } }>;
type ConPortada = FastifyRequest<{ Params: { id: string; version: string; variante: string } }>;
const esVariantePortada = (variante: string): variante is VariantePortada => Object.hasOwn(variantesPortada, variante);
const error = (reply: FastifyReply, status: number, code: string, message: string) => reply.code(status).send({ code, message });
function resumenPublico({ id, titulo, descripcion, instructorNombre, horasLectivas, modalidad, costo, precioGeneral, cupos,
  cuposDisponibles, categoria, fechaInicio, fechaFin, modalidadCobro, plazoPagoMinutos, versionCobro, portadaUrl, portadaFuentes }: Curso, padronDisponible: boolean) {
  const admiteExternos = padronDisponible && (costo === 0 || (precioGeneral !== null && modalidadCobro !== null));
  return { id, titulo, descripcion, instructorNombre, horasLectivas, modalidad, costo, precioGeneral, cupos,
    cuposDisponibles, categoria, fechaInicio, fechaFin, modalidadCobro, plazoPagoMinutos, versionCobro,
    portadaUrl: portadaUrl ?? null, ...(portadaFuentes && { portadaFuentes }), ...(admiteExternos && { admiteExternos }) };
}

function puedeConsultarCurso(curso: Pick<Curso, 'instructorId' | 'estado'>, usuario: UsuarioAutenticado) {
  const asignado = curso.instructorId === String(usuario.id);
  return (usuario.role !== 'instructor' || asignado) && (curso.estado !== 'BORRADOR' || usuario.role === 'admin' || asignado);
}

async function procesarPortadaDeSolicitud(entrada: unknown, request: FastifyRequest, reply: FastifyReply) {
  try {
    return await procesarPortada(entrada);
  } catch (fallo) {
    if (!(fallo instanceof ErrorPortada)) throw fallo;
    request.log.info({ code: fallo.code }, 'Portada rechazada');
    await reply.code(422).send({ code: fallo.code, message: fallo.message, fields: { portada: fallo.message } });
    return null;
  }
}

const cursoNoExiste = (reply: FastifyReply) => error(reply, 404, 'CURSO_NO_EXISTE', 'El curso no existe.');
const portadaNoExiste = (reply: FastifyReply) => error(reply, 404, 'PORTADA_NO_EXISTE', 'La portada no está disponible.');
const accesoCursoDenegado = (reply: FastifyReply) => error(reply, 403, 'SIN_PERMISO', 'No tienes permiso para acceder a este curso.');

/** Origen público de enlaces e imágenes; nunca se deriva del host de la solicitud. */
const origenCatalogo = (() => {
  const origen = env.catalogoOrigenPublico ?? env.FRONTEND_URL;
  return origenCorreoValido(origen, env.NODE_ENV !== 'production') ? new URL(origen) : null;
})();
// Se mantiene el requisito vigente de asistencia del CPPP, igual que en el detalle autenticado.
const requisitoAsistencia = 80;

async function cursoPublicado(request: ConId, reply: FastifyReply) {
  reply.header('Cache-Control', 'no-store');
  const curso = idCurso.safeParse(request.params.id).success ? await obtenerCursoPublicado(request.params.id) : null;
  if (!curso) await cursoNoExiste(reply);
  return curso;
}

async function cursoAutorizado(request: ConId, reply: FastifyReply) {
  if (!idCurso.safeParse(request.params.id).success) {
    await cursoNoExiste(reply); return null;
  }
  const curso = await obtenerCurso(request.params.id, request.usuario!.id);
  if (!curso) { await cursoNoExiste(reply); return null; }
  if (!puedeConsultarCurso(curso, request.usuario!)) {
    await accesoCursoDenegado(reply); return null;
  }
  return curso;
}

export async function registrarCursos(app: FastifyInstance) {
  app.put('/api/cursos/:id/portada', { bodyLimit: limiteCuerpoPortada }, async (request: ConId, reply) => {
    const { id } = request.params;
    if (!idCurso.safeParse(id).success) return cursoNoExiste(reply);
    const portada = await procesarPortadaDeSolicitud(request.body, request, reply);
    if (!portada) return reply;
    if (!await guardarPortada(id, portada)) return cursoNoExiste(reply);
    request.log.info({ cursoId: id, usuarioId: request.usuario!.id }, 'Portada guardada');
    return { portadaUrl: urlPortadaPrivada(id, portada.version) };
  });
  app.delete('/api/cursos/:id/portada', async (request: ConId, reply) => {
    const { id } = request.params;
    if (!idCurso.safeParse(id).success || !await retirarPortada(id)) return cursoNoExiste(reply);
    request.log.info({ cursoId: id, usuarioId: request.usuario!.id }, 'Portada retirada');
    return reply.code(204).send();
  });
  app.get('/api/cursos/:id/portada', async (request: ConId, reply) => {
    reply.header('Cache-Control', 'private, no-store');
    const { id } = request.params;
    if (!idCurso.safeParse(id).success) return portadaNoExiste(reply);
    const curso = await leerPortadaPrivada(id);
    if (!curso) return portadaNoExiste(reply);
    if (!puedeConsultarCurso(curso, request.usuario!)) return accesoCursoDenegado(reply);
    if (!curso.archivo) return portadaNoExiste(reply);
    return reply.type('image/jpeg').header('X-Content-Type-Options', 'nosniff').send(curso.archivo);
  });

  app.get('/api/publico/cursos/:id/portada/:version/:variante', async (request: ConPortada, reply) => {
    const { id, version, variante } = request.params;
    if (!idCurso.safeParse(id).success || !/^[0-9a-f]{64}$/.test(version) || !esVariantePortada(variante)) return portadaNoExiste(reply);
    const archivo = await leerPortadaPublica(id, version, variante);
    if (!archivo) return portadaNoExiste(reply);
    // La URL cambia con cada versión; aun así se revalida para no servir un curso que dejó de estar publicado.
    const etiqueta = `"${version}-${variante}"`;
    reply.header('Cache-Control', 'public, no-cache').header('ETag', etiqueta).header('X-Content-Type-Options', 'nosniff');
    if (request.headers['if-none-match'] === etiqueta) return reply.code(304).send();
    return reply.type(variantesPortada[variante]).send(archivo);
  });

  app.patch('/api/cursos/:id/cobro', async (request: ConId, reply) => {
    const curso = await cursoAutorizado(request, reply);
    if (!curso) return reply;
    const datos = esquemaCambioCobro.parse(request.body);
    if (!await actualizarCobro(curso.id, datos)) return error(reply, 409, 'COBRO_MODIFICADO', 'El curso está cerrado o sus condiciones cambiaron. Recarga antes de guardar.');
    return obtenerCurso(curso.id);
  });
  app.get('/api/publico/cursos', async (request, reply) => {
    reply.header('Cache-Control', 'no-store');
    const consulta = esquemaConsultaCatalogo.parse(request.query);
    const [pagina, padronDisponible] = await Promise.all([paginaCatalogo(0, consulta, true), admiteInscripcionExterna()]);
    // Lista explícita: nunca publicar inscritos ni materiales.
    return { ...pagina, items: pagina.items.map(curso => resumenPublico(curso, padronDisponible)) };
  });
  app.get('/api/publico/cursos/:id', async (request: ConId, reply) => {
    const curso = await cursoPublicado(request, reply);
    if (!curso) return reply;
    const [sesiones, padronDisponible] = await Promise.all([listarSesiones(curso.id), admiteInscripcionExterna()]);
    // Lista explícita: sin salas, encargados, inscritos ni materiales.
    return { ...resumenPublico(curso, padronDisponible), tipoCertificado: curso.tipoCertificado, notaMinima: curso.notaMinima,
      requisitoAsistencia, vigente: curso.vigente,
      sesiones: sesiones.filter(sesion => sesion.estado === 'PROGRAMADA')
        .map(({ id, nombre, fecha, horaInicio, horaFin, lugar, modalidad }) => ({ id, nombre, fecha, horaInicio, horaFin, lugar, modalidad })) };
  });
  app.get('/api/publico/cursos/:id/compartir', async (request: ConId, reply) => {
    const curso = await cursoPublicado(request, reply);
    if (!curso) return reply;
    if (!origenCatalogo) return error(reply, 503, 'ORIGEN_NO_CONFIGURADO', 'El enlace público del catálogo no está configurado.');
    const url = new URL(`/c/${curso.id}`, origenCatalogo);
    const imagen = curso.portadaUrl ? { url: new URL(curso.portadaUrl, origenCatalogo).href, ancho: 1280, alto: 720, tipo: 'image/jpeg' } : null;
    return { url: url.href, enlaceCorto: `${url.host}${url.pathname}`,
      vistaPrevia: { titulo: curso.titulo, descripcion: curso.descripcion, categoria: curso.categoria, imagen } };
  });
  app.get('/api/cursos/instructores', async request => {
    return (await pool.query(`select id::text,name as nombre from users where role='instructor' and active order by name`)).rows;
  });
  app.get('/api/cursos', async request => {
    const usuario = request.usuario!;
    return listarCursos(usuario.role === 'instructor' ? usuario.id : undefined);
  });
  app.get('/api/catalogo/cursos', async request => listarCursos(undefined, true));
  app.get('/api/catalogo/cursos/pagina', async (request, reply) => {
    reply.header('Cache-Control', 'private, no-store');
    const consulta = esquemaConsultaCatalogo.parse(request.query);
    return paginaCatalogo(request.usuario!.id, consulta);
  });
  app.post('/api/cursos/:id/inscribirme', async (request: ConId, reply) => {
    if (!idCurso.safeParse(request.params.id).success) return error(reply, 404, 'CURSO_NO_EXISTE', 'El curso no existe.');
    const { versionCobro, tipoPrecio } = entradaInscripcion.parse(request.body ?? {});
    const resultado = await inscribirseEnCurso(request.params.id, request.usuario!.id, versionCobro, tipoPrecio);
    if (typeof resultado === 'object') return error(reply.header('Cache-Control', 'private, no-store'), resultado.estado, resultado.codigo, resultado.mensaje);
    if (resultado==='COBRO_NO_CONFIGURADO') return error(reply,409,resultado,'El administrador debe configurar las condiciones de cobro antes de nuevas inscripciones.');
    if (resultado==='COBRO_MODIFICADO') return error(reply,409,resultado,'Las condiciones cambiaron. Recarga el curso y confírmalas antes de inscribirte.');
    if (resultado === 'NO_EXISTE') return error(reply, 404, 'CURSO_NO_EXISTE', 'El curso no existe.');
    if (resultado === 'SIN_PERMISO') return error(reply, 403, 'SIN_PERMISO', 'No tienes permiso para inscribirte en este curso.');
    if (resultado === 'NO_PUBLICADO') return error(reply, 409, 'CURSO_NO_PUBLICADO', 'El curso no está publicado.');
    if (resultado === 'SIN_CUPOS') return error(reply, 409, 'SIN_CUPOS', 'El curso está sin cupos. Elige otra capacitación.');
    const nueva = resultado === 'INSCRITO' || resultado === 'INSCRITO_PENDIENTE';
    const estados = { INSCRITO: 'EN_CURSO', YA_INSCRITO: 'EN_CURSO', YA_TERMINADO: 'TERMINADO', INSCRITO_PENDIENTE: 'PENDIENTE_PAGO', YA_PENDIENTE: 'PENDIENTE_PAGO' };
    const inscripcion=await obtenerMiInscripcion(request.params.id,request.usuario!.id);
    return reply.header('Cache-Control', 'private, no-store').code(nueva ? 201 : 200).send({ cursoId: request.params.id, estado: estados[resultado], yaInscrito: !nueva,
      intentoId:inscripcion?.intentoId??null,pagoId:inscripcion?.pagoId??null,venceEn:inscripcion?.venceEn??null });
  });
  app.post('/api/cursos', { bodyLimit: limiteCuerpoPortada }, async (request, reply) => {
    const { portada: entradaPortada, ...datos } = esquemaCurso.parse(request.body);
    const portada = entradaPortada === undefined ? undefined : await procesarPortadaDeSolicitud(entradaPortada, request, reply);
    if (portada === null) return reply;
    const id = await crearCurso(datos, request.usuario!.id, portada);
    if (!id) return reply.code(422).send({ code: 'VALIDACION', message: 'Selecciona un instructor activo del CPPP.', fields: { instructorId: 'El instructor no está disponible.' } });
    if (portada) request.log.info({ cursoId: id, usuarioId: request.usuario!.id }, 'Curso creado con portada');
    return reply.code(201).send(await obtenerCurso(id));
  });
  app.get('/api/cursos/:id', async (request: ConId, reply) => {
    const curso=await cursoAutorizado(request,reply);
    if (!curso) return reply;
    const accesoContenido=await puedeAccederContenido(curso.id,request.usuario!);
    const usuario = request.usuario!;
    const intento = curso.inscrito ? curso.miInscripcion : null;
    const faltaCotizar = env.inscripcionExternaHabilitada && curso.estado === 'PUBLICADO' && !curso.inscrito;
    let cotizacion = {};
    if (usuario.role === 'agremiado' && (faltaCotizar || intento?.tipoPrecio)) {
      const { rows: [persona] } = await pool.query<{ dni: string | null }>('select dni from users where id=$1', [usuario.id]);
      const dni = persona?.dni ?? null;
      cotizacion = intento?.tipoPrecio
        ? { miPrecio: precioDelTitular(intento.tipoPrecio, intento.importeCentimos / 100, dni) }
        : await cotizarInscripcion(pool, curso, usuario.id, dni);
    }
    return reply.header('Cache-Control','private, no-store').send({...curso,accesoContenido,
      ...cotizacion, modulos:accesoContenido?curso.modulos:[]});
  });
  app.get('/api/cursos/:id/mi-asistencia', async (request: ConId, reply) => {
    const curso = await cursoAutorizado(request, reply);
    if (!curso) return reply;
    return reply.header('Cache-Control', 'private, no-store').send(await asistenciaCurso(curso.id, request.usuario!.id));
  });
  app.post('/api/cursos/:id/sesiones', async (request: ConId, reply) => {
    const curso = await cursoAutorizado(request, reply);
    if (!curso) return reply;
    if (curso.estado === 'CERRADO') return error(reply, 409, 'CURSO_CERRADO', 'El curso está cerrado y no admite nuevas sesiones.');
    if (curso.modalidad === 'GRABADO') return error(reply, 409, 'CURSO_GRABADO', 'Un curso grabado no tiene sesiones con fecha: su contenido son lecciones en video.');
    const cuerpo = typeof request.body === 'object' && request.body !== null && !Array.isArray(request.body) ? request.body : {};
    const validacion = validarClase({ ...cuerpo, instructorId: curso.instructorId });
    if (!validacion.ok) return reply.code(422).send({ code: 'VALIDACION', message: 'Completa los datos de la sesión.', fields: validacion.fields });
    const resultado = await programarSesion(curso.id, validacion.datos, request.usuario!.id);
    if (resultado.noDisponible) return error(reply, 409, 'CURSO_NO_DISPONIBLE', 'El curso o su instructor ya no están disponibles para programar sesiones.');
    if (resultado.conflicto) return reply.code(409).send({ code: 'CONFLICTO_HORARIO',
      message: `El instructor ya tiene la clase «${resultado.conflicto.nombre}» en ese horario. Elige otro horario.`, details: { claseId: resultado.conflicto.id } });
    return reply.code(201).send(resultado.sesion);
  });
  app.post('/api/cursos/:id/publicar', async (request: ConId, reply) => {
    const curso = await cursoAutorizado(request, reply);
    if (!curso) return reply;
    if (curso.estado === 'CERRADO') return error(reply, 409, 'CURSO_CERRADO', 'Un curso cerrado no se vuelve a publicar.');
    if (!await publicarCurso(curso.id)) return error(reply, 409, 'CURSO_INCOMPLETO', 'Agrega horas lectivas y módulos antes de publicar.');
    return obtenerCurso(curso.id);
  });
  app.post('/api/cursos/:id/modulos/:moduloId/materiales', { bodyLimit: 8 * 1024 * 1024 }, async (request: ConId, reply) => {
    const curso = await cursoAutorizado(request, reply);
    if (!curso) return reply;
    if (curso.instructorId !== String(request.usuario!.id)) return error(reply, 403, 'SIN_PERMISO', 'Solo el instructor asignado puede agregar material a este curso.');
    if (!idCurso.safeParse(request.params.moduloId).success || !curso.modulos.some(m => m.id === request.params.moduloId)) return error(reply, 404, 'MODULO_NO_EXISTE', 'El módulo no pertenece a este curso.');
    const datos = esquemaMaterial.parse(request.body);
    const material = await guardarMaterial(curso.id, request.params.moduloId!, request.usuario!.id, datos);
    if (!material) return error(reply, 403, 'SIN_PERMISO', 'No tienes permiso para agregar material a este módulo.');
    return reply.code(201).send({ ...material, titulo: datos.titulo, tipo: datos.tipo, url: datos.tipo === 'PDF' ? null : datos.url });
  });
  app.get('/api/cursos/:id/modulos/:moduloId/materiales/:materialId/archivo', async (request: ConId, reply) => {
    const curso = await cursoAutorizado(request, reply);
    if (!curso) return reply;
    if (!idCurso.safeParse(request.params.moduloId).success || !idCurso.safeParse(request.params.materialId).success) return error(reply, 404, 'MATERIAL_NO_EXISTE', 'El archivo no existe.');
    if (!await puedeAccederContenido(curso.id,request.usuario!)) return error(reply,403,'CONTENIDO_NO_DISPONIBLE','Necesitas una inscripción confirmada para acceder al contenido.');
    const archivo = await obtenerArchivo(curso.id, request.params.moduloId!, request.params.materialId!);
    if (!archivo) return error(reply, 404, 'MATERIAL_NO_EXISTE', 'El archivo no existe en este módulo.');
    return reply.header('Cache-Control', 'private, no-store').header('Content-Disposition', 'attachment; filename="material.pdf"').type('application/pdf').send(archivo);
  });
}
