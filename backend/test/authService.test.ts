import assert from "node:assert/strict";
import { describe, test } from "node:test";
import type { CredencialesUsuario } from "../src/entities/auth/usuarioPublico.js";
import type { SeguridadAccesoRepository } from "../src/repositories/auth/seguridadAccesoRepository.js";
import type { UsuariosAuthRepository } from "../src/repositories/auth/usuariosAuthRepository.js";
import { crearAuthService } from "../src/services/auth/authService.js";

const cuentas: CredencialesUsuario[] = [
  { id: 4, name: "María", email: "maria@cppp.local", role: "agremiado", password_hash: "hash:demo123", active: true },
  { id: 5, name: "Luz", email: "luz@cppp.local", role: "agremiado", password_hash: "hash:demo123", active: false }
];

/** Accesos en memoria con la misma política: cinco fallos bloquean 900 s. */
function accesoFalso(bloqueoInicial = 0) {
  const fallos = new Map<string, number>();
  let bloqueo = bloqueoInicial;
  const acceso: SeguridadAccesoRepository & { bloquear(segundos: number): void } = {
    bloquear: (segundos) => { bloqueo = segundos; },
    tokenRevocado: async () => false,
    revocarToken: async () => {},
    bloqueoLogin: async () => bloqueo,
    registrarFalloLogin: async (email) => {
      const total = (fallos.get(email) ?? 0) + 1;
      fallos.set(email, total);
      if (total >= 5) bloqueo = 900;
      return total >= 5 ? 900 : 0;
    },
    aceptarLogin: async () => bloqueo,
    limitarPeticiones: async () => 0,
    limitarRegistros: async (direccion) => (direccion === "saturada" ? 42 : 0)
  };
  return acceso;
}

function servicio(acceso = accesoFalso(), registrados: unknown[] = []) {
  const usuarios: UsuariosAuthRepository = {
    buscarPorEmail: async (email) => cuentas.find((c) => c.email === email) ?? null,
    buscarActivoPorId: async (id) => cuentas.find((c) => c.id === id && c.active) ?? null,
    insertarAdministrador: async () => {},
    registrarDocente: async (datos, hash) => {
      if (datos.email === "maria@cppp.local") return null;
      registrados.push({ email: datos.email, hash });
      return { id: 9, name: `${datos.nombres} ${datos.apellidos}`, email: datos.email, role: "agremiado" };
    }
  };
  return crearAuthService({
    usuarios, acceso,
    claves: { cifrar: async (clave) => `hash:${clave}`, comparar: async (clave, hash) => hash === `hash:${clave}` },
    configuracion: { ADMIN_NAME: "Admin", ADMIN_EMAIL: "Admin@CPPP.local", ADMIN_PASSWORD: "clave-admin" }
  });
}

describe("T-26 auth: inicio de sesión", () => {
  test("acepta credenciales válidas sin exponer la clave", async () => {
    const resultado = await servicio().login("MARIA@cppp.local", "demo123");
    assert.deepEqual(resultado, { tipo: "aceptado", usuario: { id: 4, name: "María", email: "maria@cppp.local", role: "agremiado" } });
  });

  test("una clave incorrecta o un correo desconocido son credenciales inválidas", async () => {
    assert.deepEqual(await servicio().login("maria@cppp.local", "otra"), { tipo: "credencialesInvalidas" });
    assert.deepEqual(await servicio().login("nadie@cppp.local", "demo123"), { tipo: "credencialesInvalidas" });
  });

  test("la cuenta inactiva solo se revela con la clave correcta", async () => {
    assert.deepEqual(await servicio().login("luz@cppp.local", "demo123"), { tipo: "inactivo" });
    assert.deepEqual(await servicio().login("luz@cppp.local", "otra"), { tipo: "credencialesInvalidas" });
  });

  test("el quinto fallo bloquea y un bloqueo vigente se informa antes de validar", async () => {
    const acceso = accesoFalso();
    const auth = servicio(acceso);
    for (let intento = 1; intento < 5; intento++) assert.deepEqual(await auth.login("maria@cppp.local", "otra"), { tipo: "credencialesInvalidas" });
    assert.deepEqual(await auth.login("maria@cppp.local", "otra"), { tipo: "bloqueado", segundos: 900 });
    assert.deepEqual(await auth.login("maria@cppp.local", "demo123"), { tipo: "bloqueado", segundos: 900 });
  });

  test("un bloqueo aplicado mientras se validaba la clave impide la sesión", async () => {
    const acceso = accesoFalso();
    const comparar = servicio(acceso);
    const original = acceso.aceptarLogin;
    acceso.aceptarLogin = async (email) => { acceso.bloquear(600); return original(email); };
    assert.deepEqual(await comparar.login("maria@cppp.local", "demo123"), { tipo: "bloqueado", segundos: 600 });
  });
});

describe("T-26 auth: registro", () => {
  const datos = { dni: "12345678", nombres: "Ana", apellidos: "Ríos", email: "ana@cppp.local", celular: "912345678", password: "abcdefgh", aceptaPrivacidad: true as const };

  test("registra con la clave cifrada", async () => {
    const registrados: unknown[] = [];
    const resultado = await servicio(accesoFalso(), registrados).registrar(datos, "1.1.1.1");
    assert.equal(resultado.tipo, "creado");
    assert.deepEqual(registrados, [{ email: "ana@cppp.local", hash: "hash:abcdefgh" }]);
  });

  test("respeta el límite por dirección y detecta cuentas existentes", async () => {
    assert.deepEqual(await servicio().registrar(datos, "saturada"), { tipo: "limite", espera: 42 });
    assert.deepEqual(await servicio().registrar({ ...datos, email: "maria@cppp.local" }, "1.1.1.1"), { tipo: "duplicado" });
  });
});
