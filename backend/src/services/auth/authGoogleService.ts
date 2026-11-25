import { createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import type { IdentidadGoogle, IntentoGoogle, ReferenciaGoogle } from "../../entities/auth/identidadGoogle.js";
import type { NuevoDocente, PublicUser } from "../../entities/auth/usuarioPublico.js";
import type { GoogleOidc } from "../../providers/auth/googleOidc.js";
import type { IdentidadesGoogleRepository } from "../../repositories/auth/identidadesGoogleRepository.js";
import type { IntentosGoogleRepository } from "../../repositories/auth/intentosGoogleRepository.js";
import { ErrorAplicacion } from "../../shared/errorAplicacion.js";
import type { AuthService } from "./authService.js";

export type EnviarCodigoGoogle = (correo: string, codigo: string) => Promise<void>;

type Params = {
  proveedor: GoogleOidc;
  intentos: IntentosGoogleRepository;
  cuentas: IdentidadesGoogleRepository;
  auth: Pick<AuthService, "login">;
  enviarCodigo?: EnviarCodigoGoogle | undefined;
  secreto: string;
};

type IdentidadPendiente = Extract<IntentoGoogle, { fase: "identidad" }>;
type PasoGoogle =
  | { paso: "sesion"; curso: string | null; usuario: PublicUser }
  | { paso: "vincular" | "registro"; curso: string | null; correo: string }
  | { paso: "verificarCorreo"; curso: string | null; codigoEnviado: boolean }
  | { paso: "pendiente"; curso: string | null };

const conflicto = () => new ErrorAplicacion(409, "GOOGLE_INTENTO_INVALIDO", "Este intento de acceso ya no está disponible. Vuelve a iniciar con Google.");
const cuentaNoDisponible = () => new ErrorAplicacion(403, "GOOGLE_CUENTA_NO_DISPONIBLE", "Este acceso no está disponible para esa cuenta. Ingresa con tu cuenta de GestionCapa o solicita ayuda al CPPP.");
const servicioNoDisponible = () => new ErrorAplicacion(503, "GOOGLE_NO_DISPONIBLE", "El acceso con Google no está disponible en este momento. Vuelve a intentarlo.");
const finalizando = () => new ErrorAplicacion(409, "GOOGLE_FINALIZANDO", "El intento ya se está confirmando. Espera el resultado.");
const ambiguo = () => new ErrorAplicacion(409, "CUENTA_YA_REGISTRADA", "El DNI o el correo ya está registrado. Ingresa con tu cuenta de GestionCapa o solicita ayuda al CPPP.");
const correoNoDisponible = () => new ErrorAplicacion(503, "GOOGLE_CORREO_NO_DISPONIBLE", "Por ahora no podemos verificar el correo. Vuelve a intentar o solicita ayuda al CPPP.");
const codigoInvalido = () => new ErrorAplicacion(422, "GOOGLE_CODIGO_INVALIDO", "El código no es válido o ya venció. Revisa el correo o solicita otro código.");
const opaco = () => randomBytes(32).toString("base64url");

export function crearAuthGoogleService({ proveedor, intentos, cuentas, auth, enviarCodigo, secreto }: Params) {
  async function limitar(grupo: string, valor: string, maximo: number, segundos: number) {
    const espera = await intentos.limitar(grupo, valor, maximo, segundos);
    if (espera > 0) throw new ErrorAplicacion(429, "LIMITE_PETICIONES", "Has hecho demasiados intentos. Espera un momento y vuelve a intentar.",
      { details: { espera } });
  }

  async function cambiar(ref: ReferenciaGoogle, anterior: string, nuevo: IntentoGoogle | null) {
    if (!(await intentos.cambiar(ref, anterior, nuevo))) throw conflicto();
  }

  async function pendiente(ref: ReferenciaGoogle) {
    const actual = await intentos.leer(ref);
    if (!actual) throw conflicto();
    if (actual.datos.fase === "error") {
      await cambiar(ref, actual.valor, null);
      if (actual.datos.motivo === "proveedor") throw servicioNoDisponible();
      throw new ErrorAplicacion(409, "GOOGLE_CANCELADO", "Cancelaste el ingreso con Google. Puedes volver a intentarlo.");
    }
    if (actual.datos.fase !== "identidad") throw conflicto();
    return { valor: actual.valor, datos: actual.datos };
  }

  async function decidir(estado: IdentidadPendiente): Promise<PasoGoogle> {
    const vinculada = await cuentas.vinculada(estado.identidad);
    if (vinculada) {
      if (!vinculada.active || vinculada.role !== "agremiado") throw cuentaNoDisponible();
      const { id, name, email, role } = vinculada;
      return { paso: "sesion", curso: estado.curso, usuario: { id, name, email, role } };
    }
    if (!estado.correoConfirmado) return { paso: "verificarCorreo", curso: estado.curso, codigoEnviado: (estado.codigo?.vence ?? 0) > Date.now() };

    const cuenta = await cuentas.porCorreo(estado.identidad.correo);
    if (cuenta && (!cuenta.active || cuenta.role !== "agremiado" || !cuenta.password_hash)) throw cuentaNoDisponible();
    return { paso: cuenta ? "vincular" : "registro", correo: estado.identidad.correo, curso: estado.curso };
  }

  function huellaCodigo(ref: ReferenciaGoogle, identidad: IdentidadGoogle, codigo: string) {
    return createHmac("sha256", secreto).update(JSON.stringify([
      "hu41-correo", ref.intento, ref.navegador, identidad.emisor, identidad.sujeto, identidad.correo, codigo
    ])).digest("hex");
  }

  /** La primera transición decide entre confirmar y cancelar, antes de escribir en PostgreSQL. */
  async function completar(ref: ReferenciaGoogle, anterior: string, datos: IdentidadPendiente,
    operacion: (limite: number) => Promise<PublicUser | null>): Promise<PasoGoogle> {
    const confirmando = { fase: "finalizando", curso: datos.curso } as const;
    const valor = intentos.valor(ref, confirmando);
    const limite = Date.now() + 20000;
    await cambiar(ref, anterior, confirmando);
    let usuario: PublicUser | null;
    try {
      usuario = await operacion(limite);
    } catch {
      await intentos.cambiar(ref, valor, null);
      throw servicioNoDisponible();
    }
    await cambiar(ref, valor, null);
    if (!usuario) throw ambiguo();
    return { paso: "sesion", curso: datos.curso, usuario };
  }

  return {
    nuevoNavegador: opaco,

    async iniciar(curso: string | null, ip: string, navegador: string | null) {
      await limitar("inicio", ip, 30, 60);
      const referencia = { intento: opaco(), navegador: navegador ?? opaco() };
      const nonce = opaco();
      const verificador = opaco();
      if (!await intentos.crear(referencia, { fase: "oauth", nonce, verificador, curso })) throw finalizando();
      return { ...referencia, url: proveedor.autorizar(referencia.intento, nonce, verificador) };
    },

    async recibir(ref: ReferenciaGoogle, codigo: string | null, cancelado: boolean) {
      const actual = await intentos.leer(ref);
      if (!actual) return false;
      if (actual.datos.fase !== "oauth") return true;
      const { curso, nonce, verificador } = actual.datos;
      const procesando = { fase: "procesando", curso } as const;
      if (!await intentos.cambiar(ref, actual.valor, procesando)) return Boolean(await intentos.leer(ref));
      let resultado: IntentoGoogle;
      if (codigo) {
        try {
          const identidad = await proveedor.intercambiar(codigo, nonce, verificador);
          resultado = { fase: "identidad", curso, identidad, correoConfirmado: identidad.correoAutoritativo };
        } catch {
          resultado = { fase: "error", curso, motivo: "proveedor" };
        }
      } else resultado = { fase: "error", curso, motivo: cancelado ? "cancelado" : "proveedor" };
      return intentos.cambiar(ref, intentos.valor(ref, procesando), resultado);
    },

    async continuar(ref: ReferenciaGoogle): Promise<PasoGoogle> {
      const lectura = await intentos.leer(ref);
      if (lectura?.datos.fase === "procesando" || lectura?.datos.fase === "finalizando") {
        return { paso: "pendiente", curso: lectura.datos.curso };
      }
      const actual = await pendiente(ref);
      const siguiente = await decidir(actual.datos);
      if (siguiente.paso === "sesion") await cambiar(ref, actual.valor, null);
      return siguiente;
    },

    async enviarCodigo(ref: ReferenciaGoogle, ip: string) {
      const { datos, valor } = await pendiente(ref);
      if (datos.correoConfirmado || await cuentas.vinculada(datos.identidad)) throw conflicto();
      if (!enviarCodigo) throw correoNoDisponible();

      const correo = datos.identidad.correo;
      await limitar("envioIntento", ref.intento, 3, 600);
      await limitar("envioCorreo", correo, 5, 900);
      await limitar("envioIp", ip, 20, 900);
      const codigo = String(randomInt(1000000)).padStart(6, "0");
      const siguiente = { ...datos, codigo: { huella: huellaCodigo(ref, datos.identidad, codigo), vence: Date.now() + 300000, intentos: 0 } };
      await cambiar(ref, valor, siguiente);
      try {
        await enviarCodigo(correo, codigo);
      } catch {
        const { fase, curso, identidad, correoConfirmado } = datos;
        await intentos.cambiar(ref, intentos.valor(ref, siguiente), { fase, curso, identidad, correoConfirmado });
        throw correoNoDisponible();
      }
    },

    async verificarCorreo(ref: ReferenciaGoogle, codigo: string, ip: string) {
      const { datos, valor } = await pendiente(ref);
      const anterior = datos.codigo;
      if (datos.correoConfirmado || !anterior || anterior.vence <= Date.now() || anterior.intentos >= 5) throw codigoInvalido();
      await limitar("verificarCorreo", datos.identidad.correo, 25, 900);
      await limitar("verificarIp", ip, 90, 900);
      const candidata = huellaCodigo(ref, datos.identidad, codigo);
      if (!timingSafeEqual(Buffer.from(anterior.huella), Buffer.from(candidata))) {
        await cambiar(ref, valor, { ...datos, codigo: { ...anterior, intentos: anterior.intentos + 1 } });
        throw codigoInvalido();
      }
      const verificada = { fase: "identidad", curso: datos.curso, identidad: datos.identidad, correoConfirmado: true } as const;
      await cambiar(ref, valor, verificada);
      // Si otra pestaña vinculó mientras se verificaba, también consume ese intento al emitir.
      const siguiente = await decidir(verificada);
      if (siguiente.paso === "sesion") await cambiar(ref, intentos.valor(ref, verificada), null);
      return siguiente;
    },

    async vincular(ref: ReferenciaGoogle, password: string) {
      const { datos, valor } = await pendiente(ref);
      if (!datos.correoConfirmado || await cuentas.vinculada(datos.identidad)) throw conflicto();
      const cuenta = await cuentas.porCorreo(datos.identidad.correo);
      if (!cuenta || cuenta.role !== "agremiado" || !cuenta.active || !cuenta.password_hash) throw cuentaNoDisponible();
      const resultado = await auth.login(datos.identidad.correo, password);
      if (resultado.tipo === "bloqueado") throw new ErrorAplicacion(423, "ACCESO_BLOQUEADO", "Acceso bloqueado por intentos fallidos.",
        { details: { espera: resultado.segundos } });
      if (resultado.tipo !== "aceptado" || String(resultado.usuario.id) !== String(cuenta.id)) {
        throw new ErrorAplicacion(401, "CREDENCIALES_INVALIDAS", "La contraseña no corresponde a tu cuenta de GestionCapa.");
      }
      return completar(ref, valor, datos, limite => cuentas.vincular(datos.identidad, cuenta, limite));
    },

    async registrar(ref: ReferenciaGoogle, entrada: Omit<NuevoDocente, "email">, ip: string) {
      const { datos, valor } = await pendiente(ref);
      if (!datos.correoConfirmado || await cuentas.vinculada(datos.identidad)) throw conflicto();
      await limitar("registro", ip, 10, 60);
      return completar(ref, valor, datos, limite => cuentas.registrar(datos.identidad, entrada, limite));
    },

    async cancelar(ref: ReferenciaGoogle) {
      if (!await intentos.cancelar(ref)) throw finalizando();
    }
  };
}

export type AuthGoogleService = ReturnType<typeof crearAuthGoogleService>;
