import { createHash, randomUUID } from 'node:crypto';
import {
  calificarRespuestas, estadoEvaluacion, resumenEvaluacion,
  type BorradorEvaluacion, type CursoEvaluacion, type EntregaEvaluacion, type Evaluacion, type PoliticaEvaluacion
} from '../../entities/evaluaciones/evaluacion.js';
import type * as Evaluaciones from '../../repositories/evaluaciones/evaluacionesRepository.js';
import { ErrorAplicacion } from '../../shared/errorAplicacion.js';

const cursoNoExiste = () => new ErrorAplicacion(404, 'CURSO_NO_EXISTE', 'El curso no existe.');
const evaluacionNoExiste = () => new ErrorAplicacion(404, 'EVALUACION_NO_EXISTE', 'No encontramos esa evaluación.');
type Cliente = Evaluaciones.ClienteEvaluaciones;

function proyectarGestion(evaluacion: Evaluacion) {
  return {
    id: evaluacion.id, titulo: evaluacion.titulo, oficial: evaluacion.oficial,
    publicada: evaluacion.publicadaEn !== null, leccionesIds: evaluacion.leccionesIds,
    preguntas: evaluacion.preguntas.map(({ enunciado, opciones, correcta }) => ({
      enunciado, opciones: opciones.map(({ texto }) => texto), correcta
    }))
  };
}

function prepararBorrador(datos: BorradorEvaluacion) {
  return {
    ...datos,
    preguntas: datos.preguntas.map(({ enunciado, opciones, correcta }) => ({
      id: randomUUID(), enunciado, correcta,
      opciones: opciones.map(texto => ({ id: randomUUID(), texto }))
    }))
  };
}

function firmaRespuestas(respuestas: EntregaEvaluacion['respuestas']) {
  const pares = respuestas.map(({ preguntaId, opcionId }) => `${preguntaId}:${opcionId}`).sort();
  return createHash('sha256').update(pares.join('|')).digest('hex');
}

export function crearEvaluacionesService(repositorio: typeof Evaluaciones) {
  function politicaEncontrada(politica: PoliticaEvaluacion | undefined) {
    if (!politica) throw cursoNoExiste();
    return politica;
  }

  async function cursoDelInstructor(cliente: Cliente, cursoId: string, instructorId: number, escritura = false) {
    const curso = await repositorio.bloquearCurso(cliente, cursoId, escritura);
    if (!curso) throw cursoNoExiste();
    if (curso.instructorId !== String(instructorId)) {
      throw new ErrorAplicacion(403, 'SIN_PERMISO', 'Solo el instructor asignado puede gestionar las evaluaciones.');
    }
    if (escritura && curso.estado === 'CERRADO') {
      throw new ErrorAplicacion(409, 'CURSO_CERRADO', 'El curso ya está cerrado.');
    }
    return curso;
  }

  async function leccionesParaPublicar(cliente: Cliente, curso: CursoEvaluacion, evaluacion: Evaluacion) {
    if (curso.modalidad !== 'GRABADO' || !evaluacion.oficial) {
      if (evaluacion.leccionesIds.length > 0) {
        throw new ErrorAplicacion(422, 'LECCIONES_INVALIDAS', 'Solo el cuestionario de salida grabado incluye lecciones obligatorias.');
      }
      return [];
    }
    if (curso.avanceMedido) {
      const obligatorias = await repositorio.videosDelCurso(cliente, curso.id, true);
      if (obligatorias.length === 0) throw new ErrorAplicacion(422, 'LECCIONES_INVALIDAS', 'Prepara los videos obligatorios antes de publicar.');
      return obligatorias;
    }
    const ids = new Set(evaluacion.leccionesIds);
    const seleccionadas = (await repositorio.videosDelCurso(cliente, curso.id)).filter(leccion => ids.has(leccion.id));
    if (seleccionadas.length === 0 || seleccionadas.length !== ids.size) {
      throw new ErrorAplicacion(422, 'LECCIONES_INVALIDAS', 'Selecciona al menos un video válido del curso grabado.');
    }
    return seleccionadas;
  }

  async function cursoDelColegiado(cliente: Cliente, cursoId: string, usuarioId: number, escritura = false) {
    const curso = await repositorio.bloquearCurso(cliente, cursoId);
    if (!curso || curso.estado === 'BORRADOR') throw cursoNoExiste();
    const inscripcion = await repositorio.inscripcionVigente(cliente, cursoId, usuarioId, escritura);
    if (!inscripcion) throw new ErrorAplicacion(403, 'SIN_PERMISO', 'Necesitas una inscripción vigente en el curso.');
    return { curso, finalizado: curso.estado === 'CERRADO' || inscripcion.finalizada };
  }

  async function detallePublicado(cliente: Cliente, curso: CursoEvaluacion, usuarioId: number, evaluacionId: string, finalizado: boolean) {
    const evaluacion = await repositorio.buscarPublicada(cliente, curso.id, evaluacionId);
    if (!evaluacion) throw evaluacionNoExiste();
    const completadas = await repositorio.leccionesCompletadas(cliente, curso.id, usuarioId);
    const intentos = (await repositorio.resumirIntentos(cliente, curso.id, usuarioId)).get(evaluacionId);
    const resumen = resumenEvaluacion(evaluacion, curso.modalidad, completadas, finalizado, intentos);
    if (resumen.bloqueada) {
      throw new ErrorAplicacion(409, 'LECCIONES_PENDIENTES', 'Completa las lecciones obligatorias antes de rendir el cuestionario.',
        { details: { estado: resumen.estado } });
    }
    return { evaluacion, resumen };
  }

  return {
    async leerPolitica(cursoId: string) {
      return politicaEncontrada(await repositorio.leerPolitica(cursoId));
    },

    async actualizarPolitica(cursoId: string, politica: PoliticaEvaluacion) {
      return politicaEncontrada(await repositorio.actualizarPolitica(cursoId, politica));
    },

    listarGestion(cursoId: string, instructorId: number) {
      return repositorio.transaccion(async cliente => {
        const { modalidad, avanceMedido } = await cursoDelInstructor(cliente, cursoId, instructorId);
        const lecciones = await repositorio.videosDelCurso(cliente, cursoId, avanceMedido);
        const evaluaciones = await repositorio.listarGestion(cliente, cursoId);
        return { modalidad, avanceMedido, lecciones, evaluaciones: evaluaciones.map(proyectarGestion) };
      });
    },

    guardarBorrador(cursoId: string, instructorId: number, datos: BorradorEvaluacion, evaluacionId?: string) {
      return repositorio.transaccion(async cliente => {
        await cursoDelInstructor(cliente, cursoId, instructorId, true);
        const borrador = prepararBorrador(datos);
        if (!evaluacionId) return proyectarGestion(await repositorio.insertarBorrador(cliente, cursoId, borrador));
        const guardado = await repositorio.editarBorrador(cliente, cursoId, evaluacionId, borrador);
        if (guardado) return proyectarGestion(guardado);
        if (!(await repositorio.buscarEvaluacion(cliente, cursoId, evaluacionId))) throw evaluacionNoExiste();
        throw new ErrorAplicacion(409, 'EVALUACION_PUBLICADA', 'Una evaluación publicada conserva sus preguntas.');
      });
    },

    publicar(cursoId: string, instructorId: number, evaluacionId: string) {
      return repositorio.transaccion(async cliente => {
        const curso = await cursoDelInstructor(cliente, cursoId, instructorId, true);
        const evaluacion = await repositorio.buscarEvaluacion(cliente, cursoId, evaluacionId);
        if (!evaluacion) throw evaluacionNoExiste();
        if (evaluacion.publicadaEn) return proyectarGestion(evaluacion);
        if (evaluacion.preguntas.length === 0) {
          throw new ErrorAplicacion(422, 'PREGUNTAS_REQUERIDAS', 'Agrega al menos una pregunta antes de publicar.');
        }
        if (evaluacion.oficial && await repositorio.existeEvaluacionOficialPublicada(cliente, cursoId)) {
          throw new ErrorAplicacion(409, 'EVALUACION_OFICIAL_EXISTENTE', 'El curso ya tiene una evaluación oficial publicada.');
        }
        const lecciones = await leccionesParaPublicar(cliente, curso, evaluacion);
        return proyectarGestion(await repositorio.publicarEvaluacion(cliente, curso, evaluacionId, lecciones));
      });
    },

    aula(cursoId: string, usuarioId: number) {
      return repositorio.transaccion(async cliente => {
        const { curso, finalizado } = await cursoDelColegiado(cliente, cursoId, usuarioId);
        const publicadas = await repositorio.listarPublicadas(cliente, cursoId);
        const salida = publicadas.find(evaluacion => evaluacion.oficial);
        const completadas = await repositorio.leccionesCompletadas(cliente, cursoId, usuarioId);
        const intentos = await repositorio.resumirIntentos(cliente, cursoId, usuarioId);
        return {
          titulo: curso.titulo, modalidad: curso.modalidad,
          lecciones: (salida?.lecciones ?? []).map(leccion => ({ ...leccion, completada: completadas.has(leccion.id) })),
          evaluaciones: publicadas.map(evaluacion =>
            resumenEvaluacion(evaluacion, curso.modalidad, completadas, finalizado, intentos.get(evaluacion.id)))
        };
      });
    },

    completarLeccion(cursoId: string, usuarioId: number, leccionId: string) {
      return repositorio.transaccion(async cliente => {
        const { curso, finalizado } = await cursoDelColegiado(cliente, cursoId, usuarioId, true);
        const salida = (await repositorio.listarPublicadas(cliente, cursoId)).find(evaluacion => evaluacion.oficial);
        if (curso.modalidad !== 'GRABADO' || !salida?.lecciones.some(leccion => leccion.id === leccionId)) {
          throw new ErrorAplicacion(404, 'LECCION_NO_EXISTE', 'No encontramos una lección obligatoria con ese identificador.');
        }
        if (finalizado || curso.avanceMedido) {
          const completadas = await repositorio.leccionesCompletadas(cliente, cursoId, usuarioId);
          if (completadas.has(leccionId)) return { completada: true };
          if (curso.avanceMedido) throw new ErrorAplicacion(409, 'VIDEO_REQUIERE_REPRODUCCION', 'Completa esta lección desde el reproductor.');
          throw new ErrorAplicacion(409, 'RESULTADO_FINALIZADO', 'Tu resultado ya es definitivo.');
        }
        await repositorio.completarLeccion(cliente, cursoId, usuarioId, salida.id, leccionId);
        return { completada: true };
      });
    },

    detalle(cursoId: string, usuarioId: number, evaluacionId: string) {
      return repositorio.transaccion(async cliente => {
        const { curso, finalizado } = await cursoDelColegiado(cliente, cursoId, usuarioId);
        const { evaluacion, resumen } = await detallePublicado(cliente, curso, usuarioId, evaluacionId, finalizado);
        return {
          ...resumen,
          preguntas: evaluacion.preguntas.map(({ id, enunciado, opciones }) => ({
            id, enunciado, opciones: opciones.map(({ id, texto }) => ({ id, texto }))
          }))
        };
      });
    },

    rendir(cursoId: string, usuarioId: number, evaluacionId: string, entrega: EntregaEvaluacion) {
      return repositorio.transaccion(async cliente => {
        const { curso, finalizado } = await cursoDelColegiado(cliente, cursoId, usuarioId, true);
        const { evaluacion, resumen: { estado } } = await detallePublicado(cliente, curso, usuarioId, evaluacionId, finalizado);
        const { operacionId, respuestas } = entrega;
        const respuestasHash = firmaRespuestas(respuestas);
        const anterior = await repositorio.buscarOperacion(cliente, evaluacionId, usuarioId, operacionId);
        const conflicto = (code: string, message: string) => new ErrorAplicacion(409, code, message, { details: { estado } });

        if (anterior) {
          if (anterior.respuestasHash !== respuestasHash) {
            throw conflicto('OPERACION_EN_CONFLICTO', 'Esta operación ya se usó para otras respuestas.');
          }
          return { nota: anterior.nota, aprobado: anterior.nota >= evaluacion.notaMinima, estado };
        }
        if (estado.finalizado) throw conflicto('RESULTADO_FINALIZADO', 'Tu resultado ya es definitivo.');
        if (estado.intentosRestantes === 0) throw conflicto('INTENTOS_AGOTADOS', 'Ya usaste todos tus intentos.');

        const nota = calificarRespuestas(evaluacion.preguntas, respuestas);
        if (nota === null) {
          throw new ErrorAplicacion(422, 'RESPUESTAS_INVALIDAS', 'Elige una opción válida para cada pregunta.');
        }
        const numero = estado.intentosUsados + 1;
        await repositorio.guardarIntento(cliente, { cursoId, usuarioId, evaluacionId, operacionId, respuestasHash, numero, nota });
        return {
          nota, aprobado: nota >= evaluacion.notaMinima,
          estado: estadoEvaluacion(evaluacion, false, { mejorNota: Math.max(estado.mejorNota ?? nota, nota), intentosUsados: numero })
        };
      });
    }
  };
}

export type EvaluacionesService = ReturnType<typeof crearEvaluacionesService>;
