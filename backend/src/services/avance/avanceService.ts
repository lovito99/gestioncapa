import { randomUUID } from 'node:crypto';
import {
  alcanzaUmbral, bloqueosLecciones, esVideoObligatorio, intervaloAcreditable, resumirAvance, usaSecuencia,
  type ConfiguracionUnidad, type CursoAvance, type MaterialAvance, type ReporteReproduccion
} from '../../entities/avance/avance.js';
import type * as Avance from '../../repositories/avance/avanceRepository.js';
import { ErrorAplicacion } from '../../shared/errorAplicacion.js';

type Cliente = Avance.ClienteAvance;
type Actor = { id: number; role: string };

const sinAcceso = () => new ErrorAplicacion(403, 'SIN_PERMISO', 'Necesitas acceso vigente al curso y a tu propio avance.');

function fuenteCompatible(url: string | null) {
  if (!url) return false;
  const fuente = URL.parse(url);
  return fuente?.protocol === 'https:' && !fuente.username && !fuente.password && /\.(mp4|webm|ogv|ogg|m4v)$/i.test(fuente.pathname);
}

export function crearAvanceService(repositorio: typeof Avance) {
  async function cursoExistente(cliente: Cliente, cursoId: string, escritura = false) {
    const curso = await repositorio.buscarCurso(cliente, cursoId, escritura);
    if (!curso) throw new ErrorAplicacion(404, 'CURSO_NO_EXISTE', 'El curso no existe.');
    return curso;
  }

  async function cursoDelColegiado(cliente: Cliente, cursoId: string, usuarioId: string, escritura = false) {
    const curso = await cursoExistente(cliente, cursoId);
    if (curso.estado === 'BORRADOR' || !(await repositorio.tieneInscripcion(cliente, cursoId, usuarioId, escritura))) {
      throw sinAcceso();
    }
    return curso;
  }

  async function unidadExistente(cliente: Cliente, cursoId: string, materialId: string) {
    const unidad = await repositorio.buscarMaterial(cliente, cursoId, materialId);
    if (!unidad) throw new ErrorAplicacion(404, 'MATERIAL_NO_EXISTE', 'La unidad no pertenece al curso.');
    return unidad;
  }

  async function validarSecuencia(cliente: Cliente, curso: CursoAvance, unidad: MaterialAvance, titular: string) {
    if (!usaSecuencia(curso) || !esVideoObligatorio(unidad)) return;
    const unidades = await repositorio.listarAvance(cliente, curso.id, titular);
    const bloqueo = bloqueosLecciones(unidades).get(unidad.id);
    if (bloqueo) {
      throw new ErrorAplicacion(403, 'LECCION_BLOQUEADA', `Completa ${bloqueo.titulo} para habilitar esta lección.`,
        { details: bloqueo });
    }
  }

  async function videoDelColegiado(cliente: Cliente, cursoId: string, materialId: string, usuarioId: string) {
    const curso = await cursoDelColegiado(cliente, cursoId, usuarioId, true);
    const unidad = await unidadExistente(cliente, cursoId, materialId);
    await validarSecuencia(cliente, curso, unidad, usuarioId);
    if (!unidad.duracionMs || (curso.modalidad === 'GRABADO' && !curso.medido)) {
      throw new ErrorAplicacion(409, 'VIDEO_SIN_MEDICION', 'Esta lección aún no está preparada para guardar avance.');
    }
    return { unidad, duracionMs: unidad.duracionMs };
  }

  return {
    obtener(cursoId: string, actor: Actor, titularId: string) {
      if (String(actor.id) !== titularId) throw sinAcceso();
      return repositorio.transaccion(async cliente => {
        const curso = await cursoDelColegiado(cliente, cursoId, titularId);
        const unidades = await repositorio.listarAvance(cliente, cursoId, titularId);
        return resumirAvance(curso, unidades);
      });
    },

    obtenerMaterial(cursoId: string, materialId: string, actor: Actor) {
      return repositorio.transaccion(async cliente => {
        const titular = String(actor.id);
        const curso = await cursoDelColegiado(cliente, cursoId, titular);
        const unidad = await unidadExistente(cliente, cursoId, materialId);
        await validarSecuencia(cliente, curso, unidad, titular);
        return unidad;
      });
    },

    marcarVisto(cursoId: string, materialId: string, actor: Actor) {
      return repositorio.transaccion(async cliente => {
        const titular = String(actor.id);
        await cursoDelColegiado(cliente, cursoId, titular, true);
        const unidad = await unidadExistente(cliente, cursoId, materialId);
        if (unidad.tipo === 'VIDEO') {
          throw new ErrorAplicacion(409, 'VIDEO_REQUIERE_REPRODUCCION', 'Completa esta lección desde el reproductor.');
        }
        return repositorio.marcarUnidad(cliente, cursoId, titular, unidad);
      });
    },

    gestion(cursoId: string, actor: Actor) {
      return repositorio.transaccion(async cliente => {
        const curso = await cursoExistente(cliente, cursoId);
        if (actor.role !== 'admin' && curso.instructorId !== String(actor.id)) throw sinAcceso();
        const unidades = await repositorio.listarMateriales(cliente, cursoId);
        const salidaPrevia = await repositorio.videosSalidaPrevia(cliente, cursoId);
        return { titulo: curso.titulo, modalidad: curso.modalidad, estado: curso.estado, medido: curso.medido,
          unidades, leccionesSalida: salidaPrevia.map(leccion => leccion.id) };
      });
    },

    configurar(cursoId: string, materialId: string, actor: Actor, datos: ConfiguracionUnidad) {
      return repositorio.transaccion(async cliente => {
        const curso = await cursoExistente(cliente, cursoId, true);
        if (curso.instructorId !== String(actor.id)) throw sinAcceso();
        const unidad = await unidadExistente(cliente, cursoId, materialId);
        if (unidad.obligatorio === datos.obligatorio && unidad.duracionMs === datos.duracionMs) return unidad;
        if (curso.medido || curso.estado === 'CERRADO') {
          throw new ErrorAplicacion(409, 'CONTENIDO_FIJO', 'La preparación de este curso ya está fija.');
        }
        if ((unidad.tipo === 'VIDEO' && datos.obligatorio && datos.duracionMs === null) ||
            (datos.duracionMs !== null && (unidad.tipo !== 'VIDEO' || !fuenteCompatible(unidad.url)))) {
          throw new ErrorAplicacion(422, 'DURACION_INVALIDA', 'Confirma la duración de un archivo de video HTTPS compatible.');
        }
        if (unidad.duracionMs !== datos.duracionMs && await repositorio.tieneMediciones(cliente, cursoId, materialId)) {
          throw new ErrorAplicacion(409, 'CONTENIDO_FIJO', 'Agrega un nuevo material si cambia la duración de un video con avance.');
        }
        return repositorio.actualizarMaterial(cliente, unidad, datos);
      });
    },

    activar(cursoId: string) {
      return repositorio.transaccion(async cliente => {
        const curso = await cursoExistente(cliente, cursoId, true);
        if (curso.medido) return { medido: true };
        if (curso.modalidad !== 'GRABADO' || curso.estado === 'CERRADO') {
          throw new ErrorAplicacion(409, 'MODO_MEDIDO_NO_DISPONIBLE', 'La activación corresponde a un curso grabado que sigue abierto.');
        }
        const unidades = await repositorio.listarMateriales(cliente, cursoId);
        const obligatorios = unidades.filter(unidad => unidad.tipo === 'VIDEO' && unidad.obligatorio);
        const salida = await repositorio.videosSalidaPrevia(cliente, cursoId);
        if (!obligatorios.length || obligatorios.some(unidad => unidad.duracionMs === null)
          || salida.some(leccion => !obligatorios.some(unidad => unidad.id === leccion.id && unidad.url === leccion.url))) {
          throw new ErrorAplicacion(409, 'CONTENIDO_NO_PREPARADO', 'Prepara los videos obligatorios y los de la salida publicada antes de activar.');
        }
        await repositorio.activarCurso(cliente, cursoId);
        return { medido: true };
      });
    },

    iniciar(cursoId: string, materialId: string, actor: Actor) {
      return repositorio.transaccion(async cliente => {
        const usuarioId = String(actor.id);
        const { unidad, duracionMs } = await videoDelColegiado(cliente, cursoId, materialId, usuarioId);
        const estado = await repositorio.estadoUnidad(cliente, cursoId, usuarioId, unidad);
        const sesionId = randomUUID();
        await repositorio.iniciarSesion(cliente, cursoId, usuarioId, unidad, sesionId, estado.vistoMs);
        return { sesionId, version: unidad.version, duracionMs, ...estado };
      });
    },

    reportar(cursoId: string, materialId: string, actor: Actor, reporte: ReporteReproduccion) {
      return repositorio.transaccion(async cliente => {
        const usuarioId = String(actor.id);
        const { unidad, duracionMs } = await videoDelColegiado(cliente, cursoId, materialId, usuarioId);
        const sesion = await repositorio.buscarSesion(cliente, cursoId, usuarioId, unidad, reporte.sesionId);
        if (!sesion || sesion.desdeReporteMs > 30000) {
          throw new ErrorAplicacion(409, 'SESION_REPRODUCCION_CERRADA', 'Vuelve a iniciar la reproducción para guardar avance.');
        }
        const estado = await repositorio.estadoUnidad(cliente, cursoId, usuarioId, unidad);
        if (reporte.secuencia <= sesion.secuencia) return estado;
        if (reporte.secuencia !== sesion.secuencia + 1) {
          throw new ErrorAplicacion(409, 'SECUENCIA_INVALIDA', 'Sincroniza el avance anterior antes de continuar.');
        }
        const vistoMs = intervaloAcreditable(reporte, duracionMs, estado.vistoMs, sesion);
        if (vistoMs === null) {
          throw new ErrorAplicacion(409, 'TRAMO_NO_VALIDO', 'Retoma el video desde una posición ya vista.');
        }
        return repositorio.guardarReproduccion(cliente, cursoId, usuarioId, unidad, {
          sesionId: reporte.sesionId, secuencia: reporte.secuencia, posicionMs: reporte.posicionMs,
          vistoMs, completa: alcanzaUmbral(vistoMs, duracionMs)
        });
      });
    }
  };
}

export type AvanceService = ReturnType<typeof crearAvanceService>;
