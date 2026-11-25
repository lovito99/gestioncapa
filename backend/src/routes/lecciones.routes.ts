import { env } from '../config/env.js';
import { leccionesController } from '../controllers/lecciones/leccionesController.js';
import { crearProveedorYoutube, type ConsultarYoutube } from '../providers/lecciones/youtubeProvider.js';
import * as repositorio from '../repositories/lecciones/leccionesRepository.js';
import { crearLeccionesService } from '../services/lecciones/leccionesService.js';

export const consultarYoutube = crearProveedorYoutube(env.youtubeClaveApi);

export function registrarLecciones(consultar: ConsultarYoutube = consultarYoutube) {
  return leccionesController(crearLeccionesService(repositorio, consultar));
}
