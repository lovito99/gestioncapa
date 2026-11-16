import { randomBytes } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { parseEnv as parse } from 'node:util';
import { componenteEventos, entornoSalaSegura, fijarValores } from './configuracionJitsi.mjs';

// Uso:
//   node infraestructura/jitsi/preparar.mjs --local
//   node infraestructura/jitsi/preparar.mjs meet.empresa.pe --api=https://api.empresa.pe/api/jitsi
//   node infraestructura/jitsi/preparar.mjs --actualizar [--api=URL]   (instalación existente, HU-26)
const carpeta = fileURLToPath(new URL('.', import.meta.url));
const argumentos = process.argv.slice(2);
const actualizar = argumentos.includes('--actualizar');
const modoLocal = argumentos.includes('--local');
const apiIndicada = argumentos.find(argumento => argumento.startsWith('--api='))?.slice(6);
const archivoBackend = resolve(carpeta, '../../backend/.env');
const archivoServidor = resolve(carpeta, 'servidor/.env');
const configuracion = resolve(carpeta, 'configuracion');
const archivoEventos = resolve(configuracion, 'prosody/config/conf.d/gestioncapa.cfg.lua');
const existe = ruta => access(ruta).then(() => true, error => { if (error.code === 'ENOENT') return false; throw error; });

/** Prosody no consulta /etc/hosts: en local se usa la IP de la puerta de enlace de Docker. */
function apiLocal(puerto) {
  const puerta = execFileSync('docker', ['network', 'inspect', 'bridge', '--format', '{{range .IPAM.Config}}{{.Gateway}}{{end}}'], { encoding: 'utf8' }).trim();
  if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(puerta)) throw new Error('No se obtuvo la puerta de enlace de Docker. Indica --api=http://IP:PUERTO/api/jitsi.');
  return `http://${puerta}:${puerto}/api/jitsi`;
}

async function escribirEventos(dominio, apiPrefijo, secreto) {
  await mkdir(resolve(configuracion, 'prosody/config/conf.d'), { recursive: true });
  await writeFile(archivoEventos, componenteEventos({ dominio, apiPrefijo, secreto }), { mode: 0o600 });
}

const contenidoBackend = await readFile(archivoBackend, 'utf8');
const entorno = parse(contenidoBackend);

if (actualizar) {
  // Conserva secretos y dominio; solo añade lo que exige la sala segura.
  if (!(await existe(archivoServidor))) throw new Error('No existe servidor/.env: prepara primero con --local o con el dominio.');
  const servidor = await readFile(archivoServidor, 'utf8');
  const dominio = parse(servidor).XMPP_DOMAIN;
  if (!dominio) throw new Error('servidor/.env no define XMPP_DOMAIN.');
  const secreto = entorno.jitsiEventosSecreto || randomBytes(48).toString('base64url');
  const local = dominio === 'localhost';
  const apiPrefijo = apiIndicada ?? (local ? apiLocal(entorno.PORT || '8080') : undefined);
  if (!apiPrefijo) throw new Error('Indica la dirección del backend visible desde Prosody: --api=https://.../api/jitsi');
  await writeFile(archivoServidor, entornoSalaSegura(servidor), { mode: 0o600 });
  await escribirEventos(dominio, apiPrefijo, secreto);
  await writeFile(archivoBackend, fijarValores(contenidoBackend, { jitsiEventosSecreto: secreto }), { mode: 0o600 });
  console.log('Sala segura aplicada. Reinicia Jitsi en una ventana de mantenimiento (cd infraestructura/jitsi/servidor && docker compose up -d) y después el backend.');
  process.exit(0);
}

const dominio = modoLocal ? 'localhost' : argumentos.find(argumento => !argumento.startsWith('--'));
const direccionServidor = modoLocal ? 'http://localhost:8000' : `https://${dominio}:8443`;
if (!dominio || !/^[a-zA-Z0-9.-]+$/.test(dominio)) {
  throw new Error('Uso: node infraestructura/jitsi/preparar.mjs meet.empresa.pe --api=https://api.empresa.pe/api/jitsi');
}
if (await existe(archivoServidor)) throw new Error('servidor/.env ya existe; se conserva. Usa --actualizar para aplicar la sala segura.');
if (entorno.jitsiHabilitado === 'true') throw new Error('Jitsi ya está habilitado; se conserva su configuración. Usa --actualizar.');
const apiPrefijo = apiIndicada ?? (modoLocal ? apiLocal(entorno.PORT || '8080') : undefined);
if (!apiPrefijo) throw new Error('Indica la dirección del backend visible desde Prosody: --api=https://.../api/jitsi');
const secreto = randomBytes(48).toString('base64url');
const secretoEventos = randomBytes(48).toString('base64url');
const directorios = ['web','prosody/config/conf.d','prosody/prosody-plugins-custom','jicofo','jvb','jigasi','jibri','transcriber','storage/jibri','storage/prosody','storage/transcripts','storage/web','tmp/web-crontabs','tmp/web-load-test'];
for (const directorio of directorios) {
  await mkdir(resolve(configuracion, directorio), { recursive: true });
}
const plantilla = fijarValores(await readFile(resolve(carpeta, 'servidor/env.example'), 'utf8'), {
  CONFIG: configuracion, PUBLIC_URL: direccionServidor, XMPP_DOMAIN: dominio,
  XMPP_MUC_DOMAIN: `conference.${dominio}`,
  JWT_APP_ID: 'gestioncapa', JWT_APP_SECRET: secreto,
  JWT_ACCEPTED_ISSUERS: 'gestioncapa', JWT_ACCEPTED_AUDIENCES: 'gestioncapa',
  JVB_COLIBRI_PORT: '18080',
  DISABLE_HTTPS: modoLocal ? '1' : '0',
  ...(modoLocal ? { JVB_ADVERTISE_IPS: '127.0.0.1' } : {}),
  JITSI_IMAGE_VERSION: JSON.parse(await readFile(resolve(carpeta, 'version.json'), 'utf8')).version,
  JICOFO_AUTH_PASSWORD: randomBytes(32).toString('hex'), JVB_AUTH_PASSWORD: randomBytes(32).toString('hex'),
});
await writeFile(archivoServidor, entornoSalaSegura(plantilla), { flag: 'wx', mode: 0o600 });
await escribirEventos(dominio, apiPrefijo, secretoEventos);
await writeFile(archivoBackend, fijarValores(contenidoBackend, { jitsiHabilitado: 'true', jitsiDominio: dominio, jitsiDireccion: direccionServidor, jitsiAplicacion: 'gestioncapa', jitsiSecreto: secreto, jitsiEventosSecreto: secretoEventos }), { mode: 0o600 });
console.log('Configuración privada generada. Revisa PUBLIC_URL, certificado, JVB_ADVERTISE_IPS y permisos de los directorios antes de iniciar Docker.');
