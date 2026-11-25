import { createHash } from "node:crypto";
import type { IntentoGoogle, ReferenciaGoogle } from "../../entities/auth/identidadGoogle.js";
import { redis } from "../../shared/redis.js";

export const duracionIntentoGoogle = 600;
const duracionFinalizacion = 60;
const huella = (valor: string) => createHash("sha256").update(valor).digest("hex");
const guardar = (ref: ReferenciaGoogle, datos: IntentoGoogle) => JSON.stringify({ intento: ref.intento, datos });

export function crearIntentosGoogleRepository(base: string) {
  const prefijo = `gestioncapa:${base}:acceso:google:`;
  const clave = ({ navegador }: ReferenciaGoogle) => `${prefijo}intento:${huella(navegador)}`;

  return {
    async crear(ref: ReferenciaGoogle, datos: IntentoGoogle) {
      return 1 === await redis.eval(`
        local anterior = redis.call('GET', KEYS[1])
        if anterior and cjson.decode(anterior).datos.fase == 'finalizando' then return 0 end
        redis.call('SET', KEYS[1], ARGV[1], 'EX', ARGV[2])
        return 1`, 1, clave(ref), guardar(ref, datos), duracionIntentoGoogle);
    },

    async leer(ref: ReferenciaGoogle) {
      const valor = await redis.get(clave(ref));
      if (!valor) return null;
      const registro = JSON.parse(valor) as { intento: string; datos: IntentoGoogle };
      return registro.intento === ref.intento ? { valor, datos: registro.datos } : null;
    },

    /** Solo cambia el intento vigente. La finalización reclama un plazo propio para confirmar en PostgreSQL. */
    async cambiar(ref: ReferenciaGoogle, anterior: string, nuevo: IntentoGoogle | null) {
      const resultado = await redis.eval(`
        if redis.call('GET', KEYS[1]) ~= ARGV[1] then return 0 end
        if ARGV[2] == '' then return redis.call('DEL', KEYS[1]) end
        if ARGV[3] == '0' then
          redis.call('SET', KEYS[1], ARGV[2], 'KEEPTTL')
        else
          redis.call('SET', KEYS[1], ARGV[2], 'EX', ARGV[3])
        end
        return 1`, 1, clave(ref), anterior, nuevo === null ? "" : guardar(ref, nuevo),
      nuevo?.fase === "finalizando" ? duracionFinalizacion : 0);
      return resultado === 1;
    },

    valor: guardar,

    async cancelar(ref: ReferenciaGoogle) {
      const cancelado = await redis.eval(`
        local valor = redis.call('GET', KEYS[1])
        if not valor then return 1 end
        local actual = cjson.decode(valor)
        if actual.intento ~= ARGV[1] then return 1 end
        if actual.datos.fase == 'finalizando' then return 0 end
        return redis.call('DEL', KEYS[1])`, 1, clave(ref), ref.intento);
      return cancelado === 1;
    },

    async limitar(grupo: string, valor: string, maximo: number, segundos: number) {
      return Number(await redis.eval(`
        local total = redis.call('INCR', KEYS[1])
        if total == 1 then redis.call('EXPIRE', KEYS[1], ARGV[2]) end
        if total > tonumber(ARGV[1]) then return math.max(1, redis.call('TTL', KEYS[1])) end
        return 0`, 1, `${prefijo}${grupo}:${huella(valor)}`, maximo, segundos));
    }
  };
}

export type IntentosGoogleRepository = ReturnType<typeof crearIntentosGoogleRepository>;
