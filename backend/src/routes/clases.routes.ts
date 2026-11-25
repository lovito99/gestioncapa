import { env } from "../config/env.js";
import { clasesController } from "../controllers/clases/clasesController.js";
import { clasesRepository } from "../repositories/clases/clasesRepository.js";
import { crearClasesService } from "../services/clases/clasesService.js";

export const clasesRoutes = clasesController(crearClasesService({ repositorio: clasesRepository, configuracion: env }));
