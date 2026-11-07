import { createHash } from 'node:crypto';
import { redis } from '../../shared/redis.js';
import { env } from '../../config/env.js';

const duracionBloqueo = 15 * 60;
const prefijo = `gestioncapa:${env.DB_NAME}:acceso:`;
const huella = (valor: string) => createHash('sha256').update(valor).digest('hex');
const clavesLogin = (email: string) => {
  const base = `${prefijo}login:${huella(email.trim().toLowerCase())}`;
  return { fallos: `${base}:fallos`, bloqueo: `${base}:bloqueo` };
};
export const tokenDeCabecera = (cabecera = '') => cabecera.replace(/^Bearer\s+/i, '').trim();

export async function tokenRevocado(token: string) {
  return !token || (await redis.exists(`${prefijo}token:${huella(token)}`)) > 0;
}
export async function revocarToken(token: string, expiracion?: number) {
  const segundos = expiracion ? Math.ceil(expiracion - Date.now() / 1000) : 86400;
  if (segundos > 0) await redis.set(`${prefijo}token:${huella(token)}`, '1', 'EX', segundos);
}
export async function bloqueoLogin(email: string) {
  return Math.max(0, await redis.ttl(clavesLogin(email).bloqueo));
}
export async function registrarFalloLogin(email: string) {
  const claves = clavesLogin(email);
  // El quinto fallo inicia sus propios 15 minutos; no se renuevan con cada intento.
  return Number(await redis.eval(`
    if redis.call('EXISTS',KEYS[2]) == 1 then return redis.call('TTL',KEYS[2]) end
    local total=redis.call('INCR',KEYS[1])
    if total == 1 then redis.call('EXPIRE',KEYS[1],ARGV[1]) end
    if total >= 5 then redis.call('SET',KEYS[2],'1','EX',ARGV[1]); return tonumber(ARGV[1]) end
    return 0`, 2, claves.fallos, claves.bloqueo, duracionBloqueo));
}
export async function aceptarLogin(email: string) {
  const claves = clavesLogin(email);
  // Revalida después de bcrypt: otro intento pudo bloquear la cuenta mientras esperaba.
  return Number(await redis.eval(`
    if redis.call('EXISTS',KEYS[2]) == 1 then return redis.call('TTL',KEYS[2]) end
    redis.call('DEL',KEYS[1]); return 0`, 2, claves.fallos, claves.bloqueo));
}
export async function limitarPeticiones(usuarioId: number) {
  return Number(await redis.eval(`
    local total=redis.call('INCR',KEYS[1])
    if total == 1 then redis.call('EXPIRE',KEYS[1],60) end
    if total > tonumber(ARGV[1]) then return math.max(1,redis.call('TTL',KEYS[1])) end
    return 0`, 1, `${prefijo}usuario:${usuarioId}`, env.limitePeticiones));
}
