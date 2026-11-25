import { evaluacionesController } from '../controllers/evaluaciones/evaluacionesController.js';
import * as evaluaciones from '../repositories/evaluaciones/evaluacionesRepository.js';
import { crearEvaluacionesService } from '../services/evaluaciones/evaluacionesService.js';

export const registrarEvaluaciones = evaluacionesController(crearEvaluacionesService(evaluaciones));
