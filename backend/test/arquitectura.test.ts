import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { revisarComponente, revisarImports } from "./capas.js";

// Componentes ya migrados a las capas globales de src/; cada migración añade el suyo (T-26).
const componentesEnCapas: string[] = ["usuarios", "asistencia", "qr", "health", "pendientes", "jitsi", "historial", "notificaciones", "auth", "reuniones", "clases", "cursos", "pagos", "certificados"];

describe("T-26: reglas de dependencia entre capas globales", () => {
  // Rutas relativas a src/: <capa>/<componente>/<archivo>.
  const archivo = (capa: string, nombre = "ejemplo.ts") => `${capa}/ejemplo/${nombre}`;

  test("un controlador no accede a la base ni a repositorios", () => {
    const codigo = `import { pool } from "../../shared/database.js";
      import { crearEjemploRepository } from "../../repositories/ejemplo/ejemploRepository.js";
      import type { PoolClient } from "pg";`;
    assert.equal(revisarImports(archivo("controllers"), codigo).length, 3);
  });

  test("un controlador usa DTO, servicios, Fastify y tipos de plugins", () => {
    const codigo = `import type { FastifyInstance } from "fastify";
      import { esquemaAlta } from "../../dto/ejemplo/ejemploDto.js";
      import type { EjemploService } from "../../services/ejemplo/ejemploService.js";
      import type { UsuarioAutenticado } from "../../plugins/autorizacion.js";`;
    assert.deepEqual(revisarImports(archivo("controllers"), codigo), []);
  });

  test("un servicio no conoce HTTP, SQL, configuración global ni rutas", () => {
    const codigo = `import type { FastifyReply } from "fastify";
      import { pool } from "../../shared/database.js";
      import { env } from "../../config/env.js";
      import { crearEjemploRepository } from "../../repositories/ejemplo/ejemploRepository.js";
      import { ejemploRoutes } from "../../routes/ejemplo.routes.js";`;
    assert.equal(revisarImports(archivo("services"), codigo).length, 5);
  });

  test("un servicio depende de repositorios solo por tipos y puede usar otros servicios", () => {
    const codigo = `import type { EjemploRepository } from "../../repositories/ejemplo/ejemploRepository.js";
      import type { Clase } from "../../modules/clases/clases.repositorio.js";
      import { verificarTokenQr } from "../qr/qrToken.js";
      import { ErrorAplicacion } from "../../shared/errorAplicacion.js";
      import type { Ejemplo } from "../../entities/ejemplo/ejemplo.js";`;
    assert.deepEqual(revisarImports(archivo("services"), codigo), []);
  });

  test("un repositorio no conoce Fastify, servicios ni controladores", () => {
    const codigo = `import type { FastifyInstance } from "fastify";
      import { crearEjemploService } from "../../services/ejemplo/ejemploService.js";
      export { ejemploController } from "../../controllers/ejemplo/ejemploController.js";`;
    assert.equal(revisarImports(archivo("repositories"), codigo).length, 3);
  });

  test("un repositorio usa la base, la transacción y las entidades", () => {
    const codigo = `import type { Consultor } from "../../shared/database.js";
      import { conTransaccion } from "../../shared/transaccion.js";
      import type { Pool } from "pg";
      import type { Ejemplo } from "../../entities/ejemplo/ejemplo.js";`;
    assert.deepEqual(revisarImports(archivo("repositories"), codigo), []);
  });

  test("un repositorio puede usar otro repositorio, también de un módulo sin migrar, pero no sus rutas ni servicios", () => {
    assert.deepEqual(revisarImports(archivo("repositories"), `import { obtenerClase } from "../../modules/clases/clases.repositorio.js";
      import { buscar } from "../cursos/cursosRepository.js";`), []);
    assert.equal(revisarImports(archivo("repositories"), `import { clasesRoutes } from "../../modules/clases/clases.routes.js";
      import { marcar } from "../../services/clases/clasesService.js";`).length, 2);
  });

  test("un DTO solo usa zod, validación compartida y entidades", () => {
    assert.deepEqual(revisarImports(archivo("dto"), `import { z } from "zod";
      import { textoObligatorio } from "../../shared/validacion.js";
      import type { Rol } from "../../entities/ejemplo/ejemplo.js";`), []);
    assert.equal(revisarImports(archivo("dto"), `import bcrypt from "bcryptjs";`).length, 1);
  });

  test("una entidad no importa nada fuera de las entidades", () => {
    assert.equal(revisarImports(archivo("entities"), `import { z } from "zod";`).length, 1);
    assert.deepEqual(revisarImports(archivo("entities"), `import type { Rol } from "./rol.js";`), []);
  });

  test("un proveedor integra paquetes externos sin conocer HTTP, la base ni otras capas", () => {
    assert.deepEqual(revisarImports(archivo("providers"), `import nodemailer, { type SendMailOptions } from "nodemailer";
      import { SignJWT } from "jose";
      import type { DatosCorreo } from "../../entities/correo/correo.js";`), []);
    assert.equal(revisarImports(archivo("providers"), `import type { FastifyInstance } from "fastify";
      import { pool } from "../../shared/database.js";
      import { crearEjemploService } from "../../services/ejemplo/ejemploService.js";
      import { env } from "../../config/env.js";`).length, 4);
  });

  test("un servicio usa proveedores solo por tipos y puede validar con un DTO", () => {
    assert.deepEqual(revisarImports(archivo("services"), `import type { Transporte } from "../../providers/correo/smtp.js";
      import { esCorreoValido } from "../../dto/correo/correoDto.js";`), []);
    assert.equal(revisarImports(archivo("services"), `import { crearTransporte } from "../../providers/correo/smtp.js";`).length, 1);
  });

  test("el SQL dentro del código no se confunde con un import", () => {
    const codigo = 'export const repositorio = {\n  async leer() {\n    return pool.query(`select 1 from "controlPadronCppp" r`);\n  }\n};';
    assert.deepEqual(revisarImports(archivo("repositories"), codigo), []);
  });

  test("un import dinámico también se revisa", () => {
    assert.equal(revisarImports(archivo("services"), `const { pool } = await import("../../shared/database.js");`).length, 1);
  });

  test("un archivo fuera de una capa se rechaza", () => {
    assert.equal(revisarImports("modules/ejemplo/ejemplo.rutas.ts", `import { z } from "zod";`).length, 1);
  });
});

describe("T-26: componentes migrados", () => {
  for (const componente of componentesEnCapas) {
    test(`${componente} vive en las capas globales y respeta sus dependencias`, () => {
      assert.deepEqual(revisarComponente(componente), []);
    });
  }
});
