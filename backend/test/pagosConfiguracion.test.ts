import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseEnv } from '../src/config/env.schema.js';

const base = { DB_HOST:'localhost',DB_NAME:'test',DB_USER:'test',DB_PASSWORD:'solo-pruebas',REDIS_URL:'redis://localhost:6379',
  JWT_SECRET:'sesion-de-prueba-32-caracteres-minimo',QR_SECRET:'qr-de-prueba-distinto-32-caracteres-minimo',ADMIN_EMAIL:'test@example.org',ADMIN_PASSWORD:'clave-solo-de-prueba' };
test('HU53-08: pasarelas deshabilitadas por defecto; ejemplos no habilitan cobros', () => {
  const config = parseEnv(base);
  assert.equal(config.izipayHabilitado, false); assert.equal(config.culqiHabilitado, false);
  assert.equal(config.pagosEntorno, 'sandbox');
});
test('HU53-08: activar exige credenciales propias, entorno coherente y callback HTTPS', () => {
  for (const cambio of [{ izipayHabilitado:'true' },{ culqiHabilitado:'true' }, { pagosEntorno:'produccion' },
    { culqiHabilitado:'true', culqiClavePublica:'pk_test_CAMBIA',culqiClaveSecreta:'sk_test_CAMBIA',pagosUrlPublica:'https://cursos.example.org' }]) {
    assert.throws(() => parseEnv({ ...base,...cambio }));
  }
  const config = parseEnv({ ...base,culqiHabilitado:'true',culqiClavePublica:'pk_test_soloEjemploSinCuenta',culqiClaveSecreta:'sk_test_soloEjemploSinCuenta',pagosUrlPublica:'https://cursos.example.org' });
  assert.equal(config.culqiHabilitado, true);
  assert.throws(() => parseEnv({ ...base,culqiHabilitado:'true',culqiClavePublica:'pk_live_noUsar',culqiClaveSecreta:'sk_live_noUsar',pagosUrlPublica:'https://cursos.example.org' }));
});

test('HU54-06: una tasa vacía deja el instrumento sin configurar y cero lo habilita explícitamente', () => {
  const config = parseEnv({ ...base, izipayComisionTarjeta: '0', izipayComisionYape: '  ' });
  assert.equal(config.izipayComisionTarjeta, 0);
  assert.equal(config.izipayComisionYape, undefined);
  assert.equal(config.izipayConciliacionHabilitada, false);
  assert.throws(() => parseEnv({ ...base, izipayConciliacionHabilitada: 'true' }));
});

test('T25-I02: transferencia apagada exige destino institucional completo al habilitar', () => {
  assert.equal(parseEnv(base).transferenciaHabilitada, false);
  assert.throws(() => parseEnv({ ...base, transferenciaHabilitada:'true' }));
  const destino = { transferenciaHabilitada:'true', transferenciaBanco:'BCP',
    transferenciaTitular:'Entidad exclusivamente de prueba', transferenciaCuenta:'1234567890123',
    transferenciaCci:'00212345678901234567' };
  assert.equal(parseEnv({ ...base,...destino }).transferenciaBanco,'BCP');
  for (const cambio of [{transferenciaCci:'123'},{transferenciaTitular:'CAMBIA_TITULAR'},{transferenciaCuenta:'https://cuenta.test'}]) {
    assert.throws(() => parseEnv({ ...base,...destino,...cambio }));
  }
});
test('HU32-07/08: retención de tres meses y SMTP apagado; TLS obligatorio fuera de prueba local',()=>{
  assert.equal(parseEnv(base).voucherRetencionMeses,3);
  assert.equal(parseEnv(base).correoHabilitado,false);
  assert.equal(parseEnv(base).correoPlazoEnvioMs,60000);
  assert.throws(()=>parseEnv({...base,correoPlazoEnvioMs:'120000'}));
  assert.throws(()=>parseEnv({...base,correoHabilitado:'true'}));
  assert.throws(()=>parseEnv({...base,voucherRetencionMeses:'0'}));
  assert.throws(()=>parseEnv({...base,voucherRetencionMeses:'4'}));
  const correo={correoHabilitado:'true',correoServidor:'127.0.0.1',correoPuerto:'2525',correoRemitente:'pagos@prueba.local',correoSinTlsParaPruebas:'true'};
  assert.doesNotThrow(()=>parseEnv({...base,...correo,NODE_ENV:'test'}));
  assert.throws(()=>parseEnv({...base,...correo,NODE_ENV:'production'}));
  assert.throws(()=>parseEnv({...base,...correo,NODE_ENV:'test',correoServidor:'smtp.externo.test'}));
});
