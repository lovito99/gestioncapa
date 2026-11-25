import type { FastifyPluginAsync, FastifyReply } from "fastify";
import { aUsuarioSesion, esquemaLogin, esquemaRegistro } from "../../dto/auth/authDto.js";
import { crearRespuestaSesion, type AuthService } from "../../services/auth/authService.js";

// El acceso de cada ruta lo aplica la matriz de backend/src/plugins/permisos.ts.

const tokenDeCabecera = (cabecera = "") => cabecera.replace(/^Bearer\s+/i, "").trim();

function responderBloqueo(reply: FastifyReply, segundos: number) {
  return reply.header("Retry-After", String(segundos)).code(423).send({
    code: "ACCESO_BLOQUEADO",
    message: "Acceso bloqueado por intentos fallidos. Espera 15 minutos e intenta de nuevo."
  });
}

export function authController(servicio: AuthService, configuracion: { JWT_EXPIRES_IN: string }): FastifyPluginAsync {
  return async (app) => {
    const respuestaSesion = crearRespuestaSesion(servicio, reclamos => app.jwt.sign(reclamos, { expiresIn: configuracion.JWT_EXPIRES_IN }));
    app.post("/api/auth/registro", async (request, reply) => {
      const resultado = await servicio.registrar(esquemaRegistro.parse(request.body), request.ip);
      if (resultado.tipo === "limite") return reply.header("Retry-After", String(resultado.espera)).code(429).send({
        code: "LIMITE_REGISTROS", message: `Has realizado muchos intentos de registro. Espera ${resultado.espera} segundos e intenta de nuevo.`
      });
      reply.header("Cache-Control", "no-store");
      if (resultado.tipo === "duplicado") return reply.code(409).send({
        code: "CUENTA_YA_REGISTRADA",
        message: "El DNI o el correo que ingresaste ya está registrado. Recupera tu contraseña para ingresar."
      });
      return reply.code(201).send(respuestaSesion(resultado.usuario));
    });

    app.post("/api/auth/login", async (request, reply) => {
      const { email, password } = esquemaLogin.parse(request.body);
      const resultado = await servicio.login(email, password);
      switch (resultado.tipo) {
        case "bloqueado":
          return responderBloqueo(reply, resultado.segundos);
        case "credencialesInvalidas":
          return reply.code(401).send({
            code: "CREDENCIALES_INVALIDAS",
            message: "Correo o contraseña incorrectos. Verifica tus datos e intenta de nuevo."
          });
        case "inactivo":
          return reply.code(403).send({
            code: "USUARIO_INACTIVO",
            message: "Tu cuenta está desactivada. Comunícate con el administrador."
          });
        case "aceptado":
          return respuestaSesion(resultado.usuario);
      }
    });

    app.post("/api/auth/logout", async (request, reply) => {
      try {
        await servicio.cerrarSesion(tokenDeCabecera(request.headers.authorization), request.expiracionParaRevocar!);
      } catch {
        request.log.error({ codigo: "REVOCACION_NO_CONFIRMADA" }, "No se pudo confirmar el cierre de la sesión.");
        return reply.code(503).send({ code: "REVOCACION_NO_CONFIRMADA", message: "No pudimos confirmar el cierre en el servidor." });
      }
      return reply.code(204).send();
    });

    app.get("/api/auth/me", async (request) => {
      const user = request.usuario!;
      return { user, usuario: aUsuarioSesion(user) };
    });
  };
}
