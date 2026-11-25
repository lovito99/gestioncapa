import bcrypt from "bcryptjs";
import { env } from "../config/env.js";
import { authController } from "../controllers/auth/authController.js";
import { crearSeguridadAccesoRepository } from "../repositories/auth/seguridadAccesoRepository.js";
import { usuariosAuthRepository } from "../repositories/auth/usuariosAuthRepository.js";
import { crearAuthService } from "../services/auth/authService.js";

import { authGoogleController } from "../controllers/auth/authGoogleController.js";
import { rutaCallbackGoogle } from "../dto/auth/authGoogleDto.js";
import { crearGoogleOidc, type GoogleOidc } from "../providers/auth/googleOidc.js";
import { crearTransporteSmtp } from "../providers/notificaciones/smtpProvider.js";
import { identidadesGoogleRepository } from "../repositories/auth/identidadesGoogleRepository.js";
import { crearIntentosGoogleRepository, duracionIntentoGoogle } from "../repositories/auth/intentosGoogleRepository.js";
import { crearAuthGoogleService, type EnviarCodigoGoogle } from "../services/auth/authGoogleService.js";

// Se pasa el objeto env, no una copia: los límites y la configuración se leen en cada uso.
const acceso = crearSeguridadAccesoRepository(env);
const servicio = crearAuthService({
  usuarios: usuariosAuthRepository,
  acceso,
  claves: { cifrar: (clave) => bcrypt.hash(clave, 12), comparar: (clave, hash) => bcrypt.compare(clave, hash) },
  configuracion: env
});

export const authRoutes = authController(servicio, env);

/** Piezas que usa el arranque: el guard de autorización y la cuenta de administrador. */
export const findUserById = servicio.buscarUsuarioActivo;
export const ensureAdminUser = servicio.asegurarAdministrador;
export const { tokenRevocado, limitarPeticiones } = acceso;

const enviarCodigoPorSmtp: EnviarCodigoGoogle = async (correo, codigo) => {
  const transporte = crearTransporteSmtp(env);
  const signal = AbortSignal.timeout(9000);
  try {
    await Promise.race([
      transporte.sendMail({ from: env.correoRemitente!, to: correo, subject: "Confirma tu correo en GestionCapa",
        text: `Tu código de verificación es ${codigo}. Vence en 5 minutos.`, signal }).then(resultado => {
        if (resultado.accepted.length !== 1) throw new Error("Entrega no confirmada.");
      }),
      new Promise<never>((_resolver, rechazar) => {
        signal.addEventListener("abort", () => rechazar(new Error("La entrega excedió el plazo.")), { once: true });
      })
    ]);
  } finally {
    transporte.close();
  }
};

export function registrarAuthGoogle(opciones: { googleOidc?: GoogleOidc; enviarCodigoGoogle?: EnviarCodigoGoogle }) {
  const origen = new URL(env.FRONTEND_URL).origin;
  const google = env.googleHabilitado ? crearAuthGoogleService({
    proveedor: opciones.googleOidc ?? crearGoogleOidc({
      cliente: env.googleClienteId!, secreto: env.googleClienteSecreto!, callback: new URL(rutaCallbackGoogle, origen).href
    }),
    intentos: crearIntentosGoogleRepository(env.DB_NAME),
    cuentas: identidadesGoogleRepository,
    auth: servicio,
    enviarCodigo: opciones.enviarCodigoGoogle ?? (env.correoHabilitado ? enviarCodigoPorSmtp : undefined),
    secreto: env.googleClienteSecreto!
  }) : null;
  return authGoogleController(google, servicio, {
    origen, duracion: duracionIntentoGoogle, caducidad: env.JWT_EXPIRES_IN, proxyConfiable: env.googleProxyConfiable
  });
}
