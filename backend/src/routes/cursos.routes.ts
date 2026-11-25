import { env } from "../config/env.js";
import { cursosController } from "../controllers/cursos/cursosController.js";
import { limiteCuerpoPortada, procesarPortadaSegura } from "../providers/cursos/portadaImagen.js";
import * as acceso from "../repositories/cursos/accesoCursoRepository.js";
import * as cursos from "../repositories/cursos/cursosRepository.js";
import { inscripcionesRepository } from "../repositories/cursos/inscripcionesRepository.js";
import * as portadas from "../repositories/cursos/portadasRepository.js";
import * as sesiones from "../repositories/cursos/sesionesCursoRepository.js";
import { crearCursosService } from "../services/cursos/cursosService.js";
import { crearInscripcionService } from "../services/cursos/inscripcionService.js";
import { origenCorreoValido } from "../services/notificaciones/correoContenido.js";

/** Origen público de enlaces e imágenes; nunca se deriva del host de la solicitud. */
const origenCatalogo = (() => {
  const origen = env.catalogoOrigenPublico ?? env.FRONTEND_URL;
  return origenCorreoValido(origen, env.NODE_ENV !== "production") ? new URL(origen) : null;
})();

// Se pasa el objeto env, no una copia: la política de inscripción externa se lee en cada solicitud.
const inscripciones = crearInscripcionService({ repositorio: inscripcionesRepository, configuracion: env });

export const registrarCursos = cursosController(crearCursosService({
  cursos, portadas, sesiones, acceso, inscripciones, procesarPortada: procesarPortadaSegura, origenCatalogo, configuracion: env
}), { limiteCuerpoPortada });

/** Inscripción compuesta para los scripts de demostración y las pruebas. */
export const inscribirseEnCurso = inscripciones.inscribir;
