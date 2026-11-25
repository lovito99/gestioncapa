import type { CursoLecciones, EntradaLeccion, MarcaLeccion } from '../../entities/lecciones/leccion.js';
import type { ConsultarYoutube } from '../../providers/lecciones/youtubeProvider.js';
import type * as Lecciones from '../../repositories/lecciones/leccionesRepository.js';
import { ErrorAplicacion } from '../../shared/errorAplicacion.js';

type Cliente = Lecciones.ClienteLecciones;
type Actor = { id: number; role: string };
const sinPermiso = () => new ErrorAplicacion(403, 'SIN_PERMISO', 'No tienes acceso a las lecciones de este curso.');
const noDisponible = () => new ErrorAplicacion(409, 'LECCION_NO_DISPONIBLE', 'Esta lección no está disponible para abrir.');

function modalidadGratuita(curso: CursoLecciones) {
  return curso.modalidadCobro === 'GRATUITO' || curso.modalidadCobro === 'CERTIFICADO';
}

export function crearLeccionesService(repo: typeof Lecciones, consultarYoutube: ConsultarYoutube) {
  async function cursoAutorizado(cliente: Cliente, id: string, actor: Actor, edicion = false, marcar = false) {
    if ((edicion && actor.role !== 'instructor') || (marcar && actor.role !== 'agremiado')) throw sinPermiso();
    const curso = await repo.buscarCurso(cliente, id, edicion);
    if (!curso) throw new ErrorAplicacion(404, 'CURSO_NO_EXISTE', 'El curso no existe.');
    if (actor.role === 'instructor') {
      if (curso.instructorId !== String(actor.id)) throw sinPermiso();
    } else if (actor.role !== 'agremiado' || curso.estado === 'BORRADOR' ||
        !(await repo.accesoInscripcion(cliente, id, String(actor.id), marcar))) {
      throw sinPermiso();
    }
    if (curso.modalidad !== 'GRABADO' || (edicion && curso.estado === 'CERRADO')) {
      throw new ErrorAplicacion(409, 'CURSO_SIN_LECCIONES', 'Las lecciones se gestionan en cursos grabados abiertos.');
    }
    return curso;
  }

  async function validarCobro(cliente: Cliente, curso: CursoLecciones) {
    if (!modalidadGratuita(curso) || await repo.tieneInscripcionPrevia(cliente, curso.id)) {
      throw new ErrorAplicacion(409, 'YOUTUBE_REQUIERE_ACCESO_GRATUITO', 'El video de YouTube requiere acceso gratuito al contenido del curso.');
    }
  }

  async function buscarLeccion(cliente: Cliente, cursoId: string, leccionId: string, titular?: string) {
    const leccion = await repo.buscarLeccion(cliente, cursoId, leccionId, titular);
    if (!leccion) throw new ErrorAplicacion(404, 'LECCION_NO_EXISTE', 'No encontramos esa lección en el curso.');
    return leccion;
  }

  async function reenvio(cliente: Cliente, cursoId: string, datos: EntradaLeccion) {
    const anterior = await repo.buscarOperacion(cliente, cursoId, datos.operacionId);
    if (!anterior) return null;
    const { fuenteId, ...leccion } = anterior;
    if (fuenteId !== datos.youtubeId || leccion.titulo !== datos.titulo || leccion.moduloId !== datos.moduloId) {
      throw new ErrorAplicacion(409, 'OPERACION_EN_CONFLICTO', 'Esta operación ya se usó con otra lección.');
    }
    return leccion;
  }

  return {
    listar(id: string, actor: Actor) {
      return repo.transaccion(async cliente => {
        const curso = await cursoAutorizado(cliente, id, actor);
        const gratuito = modalidadGratuita(curso) && !await repo.tieneInscripcionPrevia(cliente, id);
        const titular = actor.role === 'agremiado' ? String(actor.id) : null;
        return {
          revision: curso.revision,
          puedeGestionar: actor.role === 'instructor' && curso.estado !== 'CERRADO' && gratuito,
          lecciones: gratuito ? await repo.listar(cliente, id, titular) : [],
        };
      });
    },

    async crear(id: string, actor: Actor, datos: EntradaLeccion) {
      if (actor.role !== 'instructor') throw sinPermiso();
      const previo = await repo.transaccion(async cliente => {
        const curso = await cursoAutorizado(cliente, id, actor);
        await validarCobro(cliente, curso);
        if (curso.estado === 'CERRADO') {
          throw new ErrorAplicacion(409, 'CURSO_SIN_LECCIONES', 'El curso está cerrado.');
        }
        if (!await repo.existeModulo(cliente, id, datos.moduloId)) {
          throw new ErrorAplicacion(422, 'MODULO_NO_EXISTE', 'Selecciona un módulo del curso.');
        }
        return reenvio(cliente, id, datos);
      });
      if (previo) return previo;

      const segundos = (await consultarYoutube([datos.youtubeId])).get(datos.youtubeId);
      if (!segundos) {
        throw new ErrorAplicacion(422, 'VIDEO_YOUTUBE_INVALIDO',
          'Comprueba que el video exista, esté no listado y se pueda insertar en Perú.',
          { fields: { url: 'Usa un video no listado de YouTube que permita su inserción.' } });
      }
      return repo.transaccion(async cliente => {
        const curso = await cursoAutorizado(cliente, id, actor, true);
        await validarCobro(cliente, curso);
        const repetida = await reenvio(cliente, id, datos);
        if (repetida) return repetida;
        if (!await repo.existeModulo(cliente, id, datos.moduloId)) {
          throw new ErrorAplicacion(422, 'MODULO_NO_EXISTE', 'Selecciona un módulo del curso.');
        }
        if ((await repo.listar(cliente, id)).length >= 200) {
          throw new ErrorAplicacion(409, 'LIMITE_LECCIONES', 'Este curso ya tiene 200 lecciones de YouTube.');
        }
        const leccionId = await repo.insertar(cliente, id, datos, segundos);
        await repo.incrementarRevision(cliente, id);
        return buscarLeccion(cliente, id, leccionId);
      });
    },

    guardarOrden(id: string, actor: Actor, revision: number, ids: string[]) {
      return repo.transaccion(async cliente => {
        const curso = await cursoAutorizado(cliente, id, actor, true);
        await validarCobro(cliente, curso);
        if (curso.revision !== revision) {
          throw new ErrorAplicacion(409, 'ORDEN_MODIFICADO', 'El orden cambió. Recarga las lecciones y vuelve a intentarlo.');
        }
        const actuales = await repo.listar(cliente, id);
        const claves = new Set(actuales.map(leccion => leccion.id));
        if (ids.length !== claves.size || ids.some(leccionId => !claves.has(leccionId))) {
          throw new ErrorAplicacion(422, 'ORDEN_INVALIDO', 'El orden debe incluir todas las lecciones del curso.');
        }
        if (ids.every((leccionId, indice) => leccionId === actuales[indice]?.id)) {
          return { revision, lecciones: actuales };
        }
        await repo.reordenar(cliente, id, ids);
        return { revision: await repo.incrementarRevision(cliente, id), lecciones: await repo.listar(cliente, id) };
      });
    },

    adjuntar(id: string, leccionId: string, actor: Actor, contenidoBase64: string) {
      return repo.transaccion(async cliente => {
        const curso = await cursoAutorizado(cliente, id, actor, true);
        await validarCobro(cliente, curso);
        const leccion = await buscarLeccion(cliente, id, leccionId);
        await repo.guardarPdf(cliente, id, leccion, Buffer.from(contenidoBase64, 'base64'));
        return { tienePdf: true };
      });
    },

    descargar(id: string, leccionId: string, actor: Actor) {
      return repo.transaccion(async cliente => {
        const curso = await cursoAutorizado(cliente, id, actor);
        await validarCobro(cliente, curso);
        const archivo = await repo.buscarPdf(cliente, id, leccionId);
        if (!archivo) throw new ErrorAplicacion(404, 'PDF_NO_EXISTE', 'Esta lección no tiene un PDF adjunto.');
        return archivo;
      });
    },

    guardarEstado(id: string, leccionId: string, actor: Actor, marca: MarcaLeccion) {
      return repo.transaccion(async cliente => {
        const curso = await cursoAutorizado(cliente, id, actor, false, true);
        await validarCobro(cliente, curso);
        const titular = String(actor.id);
        const leccion = await buscarLeccion(cliente, id, leccionId, titular);
        if (marca === 'EN_CURSO' && !leccion.youtubeId) throw noDisponible();
        if (marca === 'COMPLETADA' && leccion.estado === 'PENDIENTE') {
          throw new ErrorAplicacion(409, 'LECCION_SIN_ABRIR', 'Abre la lección antes de marcarla como completada.');
        }
        return repo.marcar(cliente, id, leccionId, titular, marca);
      });
    },
  };
}
export type LeccionesService = ReturnType<typeof crearLeccionesService>;
