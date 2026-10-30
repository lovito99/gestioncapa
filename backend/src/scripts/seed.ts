import { sembrarDatos } from "../shared/seed.js";
import { pool } from "../shared/database.js";
import { MigracionError, verificarMigraciones } from "../shared/migraciones.js";
import { env } from "../config/env.js";
import { reunionesPrueba } from "../modules/reuniones/reuniones.semilla.js";

try {
  await verificarMigraciones(pool);
  const iniciarReuniones = process.argv.includes("--reuniones-disponibles");
  const { usuarios, clases, inscripciones, asistencias, reuniones, cursos, modulos, materiales, inscripcionesCurso, certificados } = await sembrarDatos(pool, env, { iniciarReuniones });
  console.log("Seed ejecutado correctamente. Usuarios disponibles:");
  console.table(usuarios.map(({ email, role }) => ({ email, rol: role })));
  console.table([{ clases, inscripciones, asistencias, reuniones, cursos, modulos, materiales, inscripcionesCurso, certificados }]);
  if (iniciarReuniones) {
    const resultado = await pool.query<{ identificador: string; titulo: string; estado: string; claseActiva: boolean }>(`
      select reunion.identificador, reunion.titulo, reunion.estado, clase.estado = 'PROGRAMADA' as "claseActiva"
      from reuniones reunion join classes clase on clase.id = reunion."claseIdentificador"
      where reunion.identificador = any($1::uuid[]) order by reunion.identificador`,
      [reunionesPrueba.map(reunion => reunion.identificador)]);
    console.table(resultado.rows.map(reunion => ({
      titulo: reunion.titulo,
      estado: reunion.estado,
      disponible: reunion.estado === "iniciada" && reunion.claseActiva,
      enlace: `${env.FRONTEND_URL.replace(/\/$/, "")}/reuniones/${reunion.identificador}`
    })));
    console.log("Se iniciaron las reuniones demo programadas de clases activas; se conservan las canceladas y finalizadas.");
    if (!env.jitsiHabilitado) console.log("Falta configurar Jitsi: ejecuta node infraestructura/jitsi/preparar.mjs --local desde la raíz y levanta su Docker Compose.");
  }
} catch (error) {
  if (error instanceof MigracionError) {
    console.error(error.message);
  } else {
    console.error("Error ejecutando seed:", error);
  }
  process.exitCode = 1;
} finally {
  await pool.end();
}
