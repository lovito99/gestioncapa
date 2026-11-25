import type { UsuarioAutenticado } from "../../plugins/autorizacion.js";
import { ErrorAplicacion } from "../../shared/errorAplicacion.js";
import type { Colegiado, Historial } from "../../entities/historial/historial.js";
import type { HistorialLectura, HistorialRepository } from "../../repositories/historial/historialRepository.js";
import { ocultarDni, resumirAsistencia, resumirHoras } from "./historialCalculos.js";

type Actor = Pick<UsuarioAutenticado, "id" | "role">;

const noExiste = (mensaje: string) => new ErrorAplicacion(404, "HISTORIAL_NO_EXISTE", mensaje);

/** Comprueba el acceso antes de leer cursos, asistencias o archivos. */
async function autorizar(lectura: HistorialLectura, actor: Actor, usuarioId: string): Promise<Colegiado> {
  // String(): el id del actor llega de pg como texto aunque su tipo diga number.
  if (!["admin", "agremiado"].includes(actor.role) || (actor.role !== "admin" && String(actor.id) !== usuarioId)) {
    throw new ErrorAplicacion(403, "SIN_PERMISO", "No tienes permiso para ver el historial de otro colegiado.");
  }
  const persona = await lectura.buscarPersona(usuarioId, actor.id);
  if (!persona) throw noExiste("El colegiado no existe.");
  if (persona.role !== "agremiado") throw noExiste("El usuario no es un colegiado.");
  return { id: persona.id, nombre: persona.nombre, dniEnmascarado: ocultarDni(persona.dni) };
}

export function crearHistorialService({ repositorio }: { repositorio: HistorialRepository }) {
  return {
    async listarColegiados(actor: Actor) {
      return (await repositorio.listarColegiados(actor.id)).map((p) => ({ id: p.id, nombre: p.nombre, dniEnmascarado: ocultarDni(p.dni) }));
    },

    obtener(actor: Actor, usuarioId: string): Promise<Historial> {
      return repositorio.enLecturaConsistente(async (lectura) => {
        const colegiado = await autorizar(lectura, actor, usuarioId);
        const cursos = await lectura.cursos(usuarioId);
        const sesiones = await lectura.sesiones(usuarioId, cursos.map((c) => c.id));
        const certificados = await lectura.certificados(usuarioId);
        return {
          colegiado, horasAcumuladas: resumirHoras(certificados), generadoEn: new Date().toISOString(),
          cursos: cursos.map((curso) => {
            const propias = sesiones.filter((s) => s.cursoId === curso.id);
            return { ...curso, sesiones: propias, asistencia: resumirAsistencia(propias), certificados: certificados.filter((c) => c.cursoId === curso.id) };
          }),
          sesionesIndependientes: sesiones.filter((s) => !s.cursoId || !cursos.some((c) => c.id === s.cursoId)),
          asistenciaGeneral: resumirAsistencia(sesiones)
        };
      });
    },

    async archivoCertificado(actor: Actor, usuarioId: string, certificadoId: string) {
      await autorizar(repositorio, actor, usuarioId);
      const archivo = await repositorio.archivoCertificado(certificadoId, usuarioId, actor.id);
      if (!archivo) throw noExiste("El certificado no existe en este historial.");
      return archivo;
    }
  };
}

export type HistorialService = ReturnType<typeof crearHistorialService>;
