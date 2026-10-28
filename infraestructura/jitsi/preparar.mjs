import { randomBytes } from 'node:crypto';
import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { parseEnv as parse } from 'node:util';

const carpeta = fileURLToPath(new URL('.', import.meta.url));
const modoLocal = process.argv[2] === '--local';
const dominio = modoLocal ? 'localhost' : process.argv[2];
const direccionServidor = modoLocal ? 'http://localhost:8000' : `https://${dominio}:8443`;
if (!dominio || !/^[a-zA-Z0-9.-]+$/.test(dominio)) {
  throw new Error('Uso: node infraestructura/jitsi/preparar.mjs meet.empresa.pe');
}
const archivoBackend = resolve(carpeta, '../../backend/.env');
const archivoServidor = resolve(carpeta, 'servidor/.env');
try { await access(archivoServidor); throw new Error('servidor/.env ya existe; se conserva.'); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
const contenidoBackend = await readFile(archivoBackend, 'utf8');
const entorno = parse(contenidoBackend);
if (entorno.jitsiHabilitado === 'true') throw new Error('Jitsi ya está habilitado; se conserva su configuración.');
const secreto = randomBytes(48).toString('base64url');
const configuracion = resolve(carpeta, 'configuracion');
const directorios = ['web','prosody/config','prosody/prosody-plugins-custom','jicofo','jvb','jigasi','jibri','transcriber','storage/jibri','storage/prosody','storage/transcripts','storage/web','tmp/web-crontabs','tmp/web-load-test'];
for (const directorio of directorios) {
  await mkdir(resolve(configuracion, directorio), { recursive: true });
}
let plantilla = await readFile(resolve(carpeta, 'servidor/env.example'), 'utf8');
const valores = {
  CONFIG: configuracion, PUBLIC_URL: direccionServidor, XMPP_DOMAIN: dominio,
  XMPP_MUC_DOMAIN: `conference.${dominio}`, ENABLE_AUTH: '1', AUTH_TYPE: 'jwt',
  ENABLE_GUESTS: '0', JWT_ALLOW_EMPTY: '0', JWT_APP_ID: 'gestioncapa', JWT_APP_SECRET: secreto,
  JWT_ACCEPTED_ISSUERS: 'gestioncapa', JWT_ACCEPTED_AUDIENCES: 'gestioncapa',
  JVB_COLIBRI_PORT: '18080',
  DISABLE_HTTPS: modoLocal ? '1' : '0',
  ...(modoLocal ? { JVB_ADVERTISE_IPS: '127.0.0.1' } : {}),
  XMPP_MODULES: 'presence_identity',
  XMPP_MUC_MODULES: 'token_affiliation',
  ENABLE_AV_MODERATION: '1',
  ENABLE_MODERATOR_CHECKS: '1',
  JICOFO_ENABLE_AUTH: '0',
  ENABLE_AUTO_OWNER: '0', JITSI_IMAGE_VERSION: JSON.parse(await readFile(resolve(carpeta, 'version.json'), 'utf8')).version,
  JICOFO_AUTH_PASSWORD: randomBytes(32).toString('hex'), JVB_AUTH_PASSWORD: randomBytes(32).toString('hex'),
};
for (const [nombre, valor] of Object.entries(valores)) {
  const patron = new RegExp(`^#?${nombre}=.*$`, 'm');
  plantilla = patron.test(plantilla) ? plantilla.replace(patron, `${nombre}=${valor}`) : `${plantilla}\n${nombre}=${valor}\n`;
}
await writeFile(archivoServidor, plantilla, { flag: 'wx', mode: 0o600 });
let nuevoBackend = contenidoBackend;
for (const [nombre, valor] of Object.entries({ jitsiHabilitado: 'true', jitsiDominio: dominio, jitsiDireccion: direccionServidor, jitsiAplicacion: 'gestioncapa', jitsiSecreto: secreto })) {
  const patron = new RegExp(`^${nombre}=.*$`, 'm');
  nuevoBackend = patron.test(nuevoBackend) ? nuevoBackend.replace(patron, `${nombre}=${valor}`) : `${nuevoBackend}\n${nombre}=${valor}\n`;
}
await writeFile(archivoBackend, nuevoBackend, { mode: 0o600 });
console.log('Configuración privada generada. Revisa PUBLIC_URL, certificado, JVB_ADVERTISE_IPS y permisos de los directorios antes de iniciar Docker.');
