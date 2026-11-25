import { healthController } from "../controllers/health/healthController.js";
import { healthRepository } from "../repositories/health/healthRepository.js";
import { crearHealthService } from "../services/health/healthService.js";

export const healthRoutes = healthController(crearHealthService({ repositorio: healthRepository }));
