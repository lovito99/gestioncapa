import assert from "node:assert/strict";
import { test } from "node:test";
import { jwtVerify } from "jose";
import { emitirCredencialJitsi } from "../src/modules/jitsi/jitsi.servicio.js";
import { datosReunion } from "../src/modules/reuniones/reuniones.validacion.js";

test('Credencial Jitsi limitada a una sala, identidad, audiencia y cinco minutos', async () => {
  const configuracion = { jitsiDominio: 'meet.prueba.local', jitsiAplicacion: 'gestioncapa', jitsiSecreto: 'secretoExclusivoDeJitsiConMasDe32Caracteres' };
  const ahora = Math.floor(Date.now() / 1000);
  const token = await emitirCredencialJitsi(configuracion, { identificador: '12', nombre: 'María', correo: 'maria@prueba.local' }, 'salaAleatoria', ahora);
  const verificacion = await jwtVerify(token, new TextEncoder().encode(configuracion.jitsiSecreto), { issuer: configuracion.jitsiAplicacion, audience: configuracion.jitsiAplicacion });
  assert.equal(verificacion.payload.sub, configuracion.jitsiDominio);
  assert.equal(verificacion.payload.room, 'salaAleatoria');
  assert.equal(verificacion.payload.exp! - verificacion.payload.iat!, 300);
  assert.deepEqual(verificacion.payload.context, { user: { id: '12', name: 'María', email: 'maria@prueba.local' } });
  await assert.rejects(jwtVerify(token, new TextEncoder().encode('otroSecreto')));
});

test('Rechaza horario invertido y campos que intenten conceder privilegios', () => {
  const datos = { claseIdentificador: 1, titulo: 'Capacitación', inicioProgramado: '2030-01-01T10:00:00-05:00', finProgramado: '2030-01-01T11:00:00-05:00' };
  assert.ok(datosReunion.safeParse(datos).success);
  assert.ok(!datosReunion.safeParse({ ...datos, finProgramado: datos.inicioProgramado }).success);
  assert.ok(!datosReunion.safeParse({ ...datos, rol: 'anfitrion' }).success);
});

test('Rechaza fechas locales sin zona horaria', () => {
  // Las rutas aceptan fechas ISO con zona explícita, nunca fechas locales ambiguas.
  assert.ok(!datosReunion.safeParse({ claseIdentificador: 1, titulo: 'Capacitación', inicioProgramado: '2030-01-01T10:00', finProgramado: '2030-01-01T11:00' }).success);
});


test('La credencial firma el rol de moderador explícito para anfitrión y asistente', async () => {
  const configuracion = { jitsiDominio: 'meet.prueba.local', jitsiAplicacion: 'gestioncapa', jitsiSecreto: 'secretoExclusivoJitsiDistintoDelResto123' };
  for (const moderador of [true, false]) {
    const token = await emitirCredencialJitsi(configuracion, { identificador: '1', nombre: 'Prueba', correo: 'prueba@local.test', moderador }, 'sala');
    const { payload } = await jwtVerify(token, new TextEncoder().encode(configuracion.jitsiSecreto));
    assert.equal((payload.context as { user: { moderator: boolean } }).user.moderator, moderador);
  }
});
