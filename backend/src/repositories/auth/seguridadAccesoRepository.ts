import { createHash } from "node:crypto";
import { redis } from "../../shared/redis.js";

/** Controles de acceso en Redis: bloqueo por intentos, revocación de tokens y límites de peticiones. */
export type SeguridadAccesoRepository = {
  tokenRevocado(token: string): Promise<boolean>;
  revocarToken(token: string, expiracion?: number): Promise<void>;
  /** Segundos restantes de bloqueo del correo; 0 si no está bloqueado. */
  bloqueoLogin(email: string): Promise<number>;
  registrarFalloLogin(email: string): Promise<number>;
  aceptarLogin(email: string): Promise<number>;
  limitarPeticiones(usuarioId: number): Promise<number>;
  limitarRegistros(direccion: string): Promise<number>;
};

async function limitarPorMinuto(clave: string, maximo: number) {
  return Number(await redis.eval(`
    local total=redis.call('INCR',KEYS[1])
    if total == 1 then redis.call('EXPIRE',KEYS[1],60) end
    if total > tonumber(ARGV[1]) then return math.max(1,redis.call('TTL',KEYS[1])) end
    return 0`, 1, clave, maximo));
}

export function limitarBusquedaDni(base: string, usuarioId: number) {
  return limitarPorMinuto(`gestioncapa:${base}:acceso:puerta:dni:${usuarioId}`, 30);
}

/** `limitePeticiones` se lee en cada llamada; el prefijo separa las claves de cada base de datos. */
export function crearSeguridadAccesoRepository(configuracion: { DB_NAME: string; limitePeticiones: number }): SeguridadAccesoRepository {
  const prefijo = `gestioncapa:${configuracion.DB_NAME}:acceso:`;
  const duracionBloqueo = 15 * 60;
  const huella = (valor: string) => createHash('sha256').update(valor).digest('hex');
  const clavesLogin = (email: string) => {
    const base = `${prefijo}login:${huella(email.trim().toLowerCase())}`;
    return { fallos: `${base}:fallos`, bloqueo: `${base}:bloqueo` };
  };

  return {
    async tokenRevocado(token: string) {
      return !token || (await redis.exists(`${prefijo}token:${huella(token)}`)) > 0;
    },
    async revocarToken(token: string, expiracion?: number) {
      const segundos = expiracion ? Math.ceil(expiracion - Date.now() / 1000) : 86400;
      if (segundos > 0) await redis.set(`${prefijo}token:${huella(token)}`, '1', 'EX', segundos);
    },
    async bloqueoLogin(email: string) {
      return Math.max(0, await redis.ttl(clavesLogin(email).bloqueo));
    },
    async registrarFalloLogin(email: string) {
      const claves = clavesLogin(email);
      // El quinto fallo inicia sus propios 15 minutos; no se renuevan con cada intento.
      return Number(await redis.eval(`
        if redis.call('EXISTS',KEYS[2]) == 1 then return redis.call('TTL',KEYS[2]) end
        local total=redis.call('INCR',KEYS[1])
        if total == 1 then redis.call('EXPIRE',KEYS[1],ARGV[1]) end
        if total >= 5 then redis.call('SET',KEYS[2],'1','EX',ARGV[1]); return tonumber(ARGV[1]) end
        return 0`, 2, claves.fallos, claves.bloqueo, duracionBloqueo));
    },
    async aceptarLogin(email: string) {
      const claves = clavesLogin(email);
      // Revalida después de bcrypt: otro intento pudo bloquear la cuenta mientras esperaba.
      return Number(await redis.eval(`
        if redis.call('EXISTS',KEYS[2]) == 1 then return redis.call('TTL',KEYS[2]) end
        redis.call('DEL',KEYS[1]); return 0`, 2, claves.fallos, claves.bloqueo));
    },
    async limitarPeticiones(usuarioId: number) {
      return limitarPorMinuto(`${prefijo}usuario:${usuarioId}`, configuracion.limitePeticiones);
    },

    /** Alta pública: acota el trabajo de bcrypt antes de disponer de un usuario. */
    async limitarRegistros(direccion: string) {
      return limitarPorMinuto(`${prefijo}registro:${huella(direccion)}`, 10);
    }
  };
}
