import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { z } from 'zod';
import { pool } from '../../shared/database.js';
import { env } from '../../config/env.js';
import { ErrorPago } from './pagos.modelo.js';

const esquemaSesion=z.object({token:z.string(),keyRSA:z.string(),comercio:z.string(),orden:z.string(),transaccionId:z.string(),
  importe:z.string(),urlIPN:z.string(),entorno:z.enum(['sandbox','produccion']),instrumento:z.enum(['TARJETA','YAPE']).optional()});
type SesionIzipay=z.infer<typeof esquemaSesion>;
const claveSesion=()=>createHash('sha256').update('gestioncapa/sesion-izipay/v1:').update(env.JWT_SECRET).digest();

export async function guardarSesionIzipay(operacionId:string,sesion:SesionIzipay) {
  const iv=randomBytes(12);
  const cifrador=createCipheriv('aes-256-gcm',claveSesion(),iv);
  cifrador.setAAD(Buffer.from(operacionId));
  const cifrado=Buffer.concat([cifrador.update(JSON.stringify(sesion),'utf8'),cifrador.final()]);
  const sesionCifrada=Buffer.concat([iv,cifrador.getAuthTag(),cifrado]).toString('base64');
  // La vigencia oficial es 15 min; se reserva un margen para transporte/reloj.
  await pool.query(`update "operacionesPago" set "sesionCifrada"=$2,"sesionVenceEn"=clock_timestamp()+interval '14 minutes'
    where id=$1 and estado='INICIADO'`,[operacionId,sesionCifrada]);
}

export async function recuperarSesionIzipay(operacionId:string):Promise<SesionIzipay|undefined> {
  const fila=(await pool.query<{sesionCifrada:string}>(`select o."sesionCifrada" from "operacionesPago" o
    join "obligacionesPago" p on p.id=o."pagoId"
    join "intentosInscripcion" t on t.id=p."intentoId"
    left join inscripciones_curso ins on ins.curso_id=t."cursoId" and ins.usuario_id=t."usuarioId"
    where o.id=$1 and o.entorno=$2 and o.estado='INICIADO' and p.estado='PENDIENTE' and o."sesionVenceEn">clock_timestamp()
    and (case when p.concepto='CURSO' then t.estado='PENDIENTE_PAGO' and t."venceEn">clock_timestamp() and ins."intentoId"=t.id
      else exists(select 1 from "entregasConstancia" e where e."pagoId"=p.id and e.estado='RETENIDA') end)
    and not exists(select 1 from "incidenciasPago" i where i."pagoId"=o."pagoId")
    and not exists(select 1 from "operacionesPago" tr where tr."pagoId"=o."pagoId" and tr.medio='TRANSFERENCIA' and tr.estado in ('INICIADO','INCIERTO','DECLARADO'))`,[operacionId,env.pagosEntorno])).rows[0];
  if (!fila?.sesionCifrada) return;
  try {
    const bytes=Buffer.from(fila.sesionCifrada,'base64');
    const descifrador=createDecipheriv('aes-256-gcm',claveSesion(),bytes.subarray(0,12));
    descifrador.setAAD(Buffer.from(operacionId));descifrador.setAuthTag(bytes.subarray(12,28));
    const json=Buffer.concat([descifrador.update(bytes.subarray(28)),descifrador.final()]).toString('utf8');
    return esquemaSesion.parse(JSON.parse(json));
  } catch { throw new ErrorPago(503,'SESION_NO_RECUPERABLE','No se pudo recuperar la sesión. Consulta el estado con el CPPP antes de realizar otro pago.'); }
}
