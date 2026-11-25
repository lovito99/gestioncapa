import { historialController } from "../controllers/historial/historialController.js";
import { historialRepository } from "../repositories/historial/historialRepository.js";
import { crearHistorialService } from "../services/historial/historialService.js";

export const registrarHistorial = historialController(crearHistorialService({ repositorio: historialRepository }));
