import { avanceController } from '../controllers/avance/avanceController.js';
import * as repositorio from '../repositories/avance/avanceRepository.js';
import { crearAvanceService } from '../services/avance/avanceService.js';

export const registrarAvance = avanceController(crearAvanceService(repositorio));
