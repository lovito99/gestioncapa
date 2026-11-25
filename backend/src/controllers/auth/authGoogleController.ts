import type { FastifyPluginAsync, FastifyRequest } from "fastify";
import {
  esquemaAltaGoogle, esquemaCallbackGoogle, esquemaCodigoGoogle, esquemaInicioGoogle, esquemaIntentoGoogle, esquemaIpGoogle,
  esquemaVinculoGoogle, identificadorGoogle, rutaCallbackGoogle, rutaGoogle
} from "../../dto/auth/authGoogleDto.js";
import type { AuthGoogleService } from "../../services/auth/authGoogleService.js";
import { validarEntrada } from "../../shared/validacion.js";
import { ErrorAplicacion } from "../../shared/errorAplicacion.js";
import { crearRespuestaSesion, type AuthService } from "../../services/auth/authService.js";

export function authGoogleController(servicio: AuthGoogleService | null, auth: AuthService,
  configuracion: { origen: string; caducidad: string; duracion: number; proxyConfiable?: string | undefined }): FastifyPluginAsync {
  const seguro = new URL(configuracion.origen).protocol === "https:";
  const cookie = seguro ? "__Host-gcGoogle" : "gcGoogleLocal";
  const retorno = "/login/google";
  const leerNavegador = (request: FastifyRequest) => {
    const valores = request.headers.cookie?.split(";").map(par => par.trim())
      .filter(par => par.startsWith(`${cookie}=`)).map(par => par.slice(cookie.length + 1)) ?? [];
    const resultado = valores.length === 1 ? identificadorGoogle.safeParse(valores[0]) : null;
    return resultado?.success ? resultado.data : null;
  };

  function ipDe(request: FastifyRequest) {
    const proxy = configuracion.proxyConfiable;
    const origenSocket = request.socket.remoteAddress?.replace(/^::ffff:/, "");
    const directa = request.headers["x-real-ip"];
    // En producción el proxy de borde reemplaza esta cabecera. El cliente directo no puede elegirla.
    return proxy && origenSocket === proxy.replace(/^::ffff:/, "") && typeof directa === "string" && esquemaIpGoogle.safeParse(directa).success
      ? directa : request.ip;
  }

  function disponible() {
    if (!servicio) throw new ErrorAplicacion(503, "GOOGLE_NO_DISPONIBLE", "El acceso con Google no está disponible.");
    return servicio;
  }

  function referencia(request: FastifyRequest, intento: string) {
    const navegador = leerNavegador(request);
    if (!navegador) throw new ErrorAplicacion(409, "GOOGLE_INTENTO_INVALIDO", "Vuelve a iniciar el acceso con Google.");
    return { intento, navegador };
  }

  return async app => {
    const emitirSesion = crearRespuestaSesion(auth, reclamos => app.jwt.sign(reclamos, { expiresIn: configuracion.caducidad }));
    const fijarCookie = (navegador: string) => `${cookie}=${navegador}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${configuracion.duracion}${seguro ? "; Secure" : ""}`;
    const cuerpo = (resultado: Awaited<ReturnType<AuthGoogleService["continuar"]>>) => {
      if (resultado.paso !== "sesion") return resultado;
      return { paso: resultado.paso, curso: resultado.curso, sesion: emitirSesion(resultado.usuario, "google") };
    };

    app.addHook("onRequest", async (request, reply) => {
      reply.header("Cache-Control", "no-store").header("Referrer-Policy", "no-referrer");
      if (request.method === "POST" && request.headers.origin !== configuracion.origen) {
        throw new ErrorAplicacion(403, "ORIGEN_INVALIDO", "El intento de acceso debe comenzar en GestionCapa.");
      }
      if (request.method === "POST" && request.headers.authorization && request.routeOptions.url !== `${rutaGoogle}/cancelar`) {
        throw new ErrorAplicacion(409, "GOOGLE_SESION_EXISTENTE", "Ya hay una sesión en esta pestaña. Ciérrala antes de intentar ingresar con Google.");
      }
    });

    app.get(`${rutaGoogle}/estado`, async (request, reply) => {
      if (servicio && !leerNavegador(request)) reply.header("Set-Cookie", fijarCookie(servicio.nuevoNavegador()));
      return { habilitado: servicio !== null };
    });
    app.post(`${rutaGoogle}/iniciar`, { bodyLimit: 4096 }, async (request, reply) => {
      const { curso } = validarEntrada(esquemaInicioGoogle, request.body);
      const { url, intento, navegador } = await disponible().iniciar(curso ?? null, ipDe(request), leerNavegador(request));
      reply.header("Set-Cookie", fijarCookie(navegador));
      return { url, intento };
    });

    app.get(rutaCallbackGoogle, { exposeHeadRoute: false }, async (request, reply) => {
      const entrada = esquemaCallbackGoogle.safeParse(request.query);
      const navegador = leerNavegador(request);
      let recibido = false;
      if (servicio && entrada.success && navegador) {
        try {
          recibido = await servicio.recibir({ intento: entrada.data.state, navegador }, entrada.data.code ?? null, entrada.data.error === "access_denied");
        } catch {
          request.log.error({ codigo: "GOOGLE_CALLBACK_NO_DISPONIBLE" }, "No se pudo completar el retorno de Google.");
        }
      }
      return reply.redirect(recibido ? retorno : `${retorno}?resultado=vencido`, 303);
    });

    app.post(`${rutaGoogle}/continuar`, { bodyLimit: 4096 }, async request => {
      const { intento } = validarEntrada(esquemaIntentoGoogle, request.body);
      return cuerpo(await disponible().continuar(referencia(request, intento)));
    });

    app.post(`${rutaGoogle}/vincular`, { bodyLimit: 4096 }, async request => {
      const { intento, password } = validarEntrada(esquemaVinculoGoogle, request.body);
      return cuerpo(await disponible().vincular(referencia(request, intento), password));
    });

    app.post(`${rutaGoogle}/registrar`, { bodyLimit: 4096 }, async request => {
      const { intento, aceptaPrivacidad, ...datos } = validarEntrada(esquemaAltaGoogle, request.body);
      return cuerpo(await disponible().registrar(referencia(request, intento), datos, ipDe(request)));
    });

    app.post(`${rutaGoogle}/enviar-codigo`, { bodyLimit: 4096 }, async (request, reply) => {
      const { intento } = validarEntrada(esquemaIntentoGoogle, request.body);
      await disponible().enviarCodigo(referencia(request, intento), ipDe(request));
      return reply.code(204).send();
    });

    app.post(`${rutaGoogle}/verificar-correo`, { bodyLimit: 4096 }, async request => {
      const { intento, codigo } = validarEntrada(esquemaCodigoGoogle, request.body);
      return cuerpo(await disponible().verificarCorreo(referencia(request, intento), codigo, ipDe(request)));
    });

    app.post(`${rutaGoogle}/cancelar`, { bodyLimit: 4096 }, async (request, reply) => {
      const { intento } = validarEntrada(esquemaIntentoGoogle, request.body);
      const navegador = leerNavegador(request);
      if (servicio && navegador) await servicio.cancelar({ intento, navegador });
      return reply.code(204).send();
    });
  };
}
