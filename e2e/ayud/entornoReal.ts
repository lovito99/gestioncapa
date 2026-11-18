import { cuentaReal } from './datos'

// Valores públicos exclusivos de E2E, compartidos por servidor y fixtures.
// La conexión a PostgreSQL/Redis se hereda de la terminal o del job de CI.
export const entornoBackendReal = {
  NODE_ENV: 'test',
  DB_NAME: 'gestioncapa_e2e',
  HOST: '127.0.0.1',
  PORT: '8180',
  FRONTEND_URL: 'http://127.0.0.1:4174',
  ADMIN_EMAIL: cuentaReal.email,
  ADMIN_PASSWORD: cuentaReal.password,
  ADMIN_NAME: 'Administrador E2E',
  JWT_SECRET: 'secreto-local-exclusivo-para-pruebas-e2e',
  QR_SECRET: 'secreto-qr-local-exclusivo-para-pruebas-e2e',
  LOG_LEVEL: 'warn',
  correoHabilitado: 'false',
  pagosEntorno: 'sandbox',
  pagosUrlPublica: 'https://gestioncapa-e2e.invalid',
  izipayHabilitado: 'true',
  izipayComisionTarjeta: '100',
  izipayComisionYape: '350',
  izipayCodigoComercio: 'E2E',
  izipayClavePublica: 'publica-local-para-e2e-hu54',
  izipayClaveHash: 'firma-local-exclusiva-para-e2e-hu54',
  izipayRsaPublica: 'rsa-publica-local-para-e2e-hu54',
  // Destino ficticio exclusivo de E2E; nunca se usa para cobrar dinero real.
  transferenciaHabilitada: 'true',
  transferenciaBanco: 'BANCO FICTICIO E2E',
  transferenciaTitular: 'Entidad ficticia de pruebas',
  transferenciaCuenta: '1234567890123',
  transferenciaCci: '00212345678901234567',
}
