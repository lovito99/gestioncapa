import nodemailer, { type SendMailOptions } from 'nodemailer';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { env } from '../../config/env.js';
import { pool } from '../../shared/database.js';
import { contenidoCorreo, type DatosCorreo, type TipoCorreo } from './correo.contenido.js';

type Aviso = {
  id: string;
  tipo: TipoCorreo;
  destinatario: string;
  emailActual: string | null;
  activo: boolean | null;
  intentos: number;
  datos: DatosCorreo | null;
  asunto: string;
  texto: string;
  pagoId: string | null;
};

export const estadosCorreo = ['PENDIENTE', 'ENVIANDO', 'ENVIADO', 'FALLIDO', 'INCIERTO', 'OMITIDO'] as const;
type EstadoCorreo = typeof estadosCorreo[number];
type Resultado = { estado: EstadoCorreo; codigo: string | null; espera?: number };

const esperas = [60, 300, 900, 3600];

function resultadoError(error: unknown, intentos: number): Resultado {
  const smtp = error as { responseCode?: number; code?: string; syscall?: string } | null;
  const codigo = smtp?.responseCode ?? 0;
  if (codigo >= 500 && codigo < 600) return { estado: 'FALLIDO', codigo: 'SMTP_RECHAZADO' };
  if ((codigo >= 400 && codigo < 500) || smtp?.code === 'EDNS' || smtp?.syscall === 'connect') {
    const espera = esperas[intentos - 1];
    return espera === undefined ? { estado: 'FALLIDO', codigo: 'SMTP_INTENTOS_AGOTADOS' }
      : { estado: 'PENDIENTE', codigo: 'SMTP_FALLO_TEMPORAL', espera };
  }
  return { estado: 'INCIERTO', codigo: 'SMTP_RESULTADO_INCIERTO' };
}

function transporteSmtp() {
  return nodemailer.createTransport({
    host: env.correoServidor!, port: env.correoPuerto, secure: env.correoSeguro,
    requireTLS: !env.correoSinTlsParaPruebas, ignoreTLS: env.correoSinTlsParaPruebas,
    ...(env.correoUsuario ? { auth: { user: env.correoUsuario, pass: env.correoClave! } } : {}),
    connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 30000,
    disableFileAccess: true, disableUrlAccess: true, logger: false, debug: false,
  });
}

const colas = {
  pagos: {
    tabla: '"notificacionesPago"',
    destinatario: 'join "obligacionesPago" p on p.id=n."pagoId" left join users u on u.id=p."usuarioId"',
    proyeccion: 'n.asunto,n.texto,n."pagoId"::text',
    identificador: 'pago',
  },
  cursos: {
    tabla: '"notificacionesCorreo"',
    destinatario: 'left join users u on u.id=n."usuarioId"',
    proyeccion: `'' as asunto,'' as texto,null as "pagoId"`,
    identificador: 'curso',
  },
} as const;

export async function procesarColaCorreo(
  origen: keyof typeof colas,
  adjuntos?: (aviso: Aviso) => SendMailOptions['attachments'],
) {
  if (!env.correoHabilitado) return 0;
  const cola = colas[origen];
  const tabla = cola.tabla;
  const transporte = transporteSmtp();
  let enviados = 0;
  try {
    await pool.query(`update ${tabla} set estado='INCIERTO',"ultimoError"='SMTP_RESULTADO_INCIERTO',
      "procesamientoId"=null,"bloqueadoHasta"=null where id in (
        select id from ${tabla} where estado='ENVIANDO' and "bloqueadoHasta"<=clock_timestamp()
        order by "bloqueadoHasta" for update skip locked limit 50)`);
    for (let turno = 0; turno < 5; turno++) {
      const proceso = randomUUID();
      const aviso = (await pool.query<Aviso>(`with reclamado as (
        update ${tabla} set estado='ENVIANDO',"procesamientoId"=$1,
          "bloqueadoHasta"=clock_timestamp()+interval '2 minutes',intentos=intentos+1
        where id=(select id from ${tabla} where estado='PENDIENTE' and "intentarEn"<=clock_timestamp()
          order by "intentarEn","creadoEn",id for update skip locked limit 1) returning *)
        select n.id,n.tipo,n.destinatario,n.intentos,n.datos,${cola.proyeccion},
          u.email as "emailActual",u.active as activo from reclamado n ${cola.destinatario}`, [proceso])).rows[0];
      if (!aviso) break;

      const resultado = await enviarAviso(transporte, aviso, cola.identificador, adjuntos);
      const guardado = await pool.query(`update ${tabla} set estado=$3::varchar,"ultimoError"=$4,
        "enviadoEn"=case when $3='ENVIADO' then clock_timestamp() else "enviadoEn" end,
        "intentarEn"=coalesce(clock_timestamp()+make_interval(secs=>$5::integer),"intentarEn"),
        "procesamientoId"=null,"bloqueadoHasta"=null where id=$1 and "procesamientoId"=$2`,
      [aviso.id, proceso, resultado.estado, resultado.codigo, resultado.espera ?? null]);
      if (resultado.estado === 'ENVIADO') enviados += guardado.rowCount ?? 0;
    }
  } finally {
    transporte.close();
  }
  return enviados;
}

async function enviarAviso(
  transporte: ReturnType<typeof transporteSmtp>, aviso: Aviso, identificador: string,
  adjuntos?: (aviso: Aviso) => SendMailOptions['attachments'],
): Promise<Resultado> {
  if (!aviso.activo || aviso.destinatario !== aviso.emailActual) {
    return { estado: 'OMITIDO', codigo: 'DESTINATARIO_CAMBIADO' };
  }
  if (!z.email().safeParse(aviso.destinatario).success) {
    return { estado: 'OMITIDO', codigo: 'CORREO_INVALIDO' };
  }

  let mensaje: SendMailOptions & { signal: AbortSignal };
  try {
    const contenido = aviso.datos
      ? contenidoCorreo(aviso.tipo, env.correoOrigenPublico ?? env.FRONTEND_URL, aviso.datos, env.NODE_ENV !== 'production')
      : { asunto: aviso.asunto, texto: aviso.texto, html: undefined };
    const archivos = adjuntos?.(aviso);
    mensaje = {
      from: env.correoRemitente!, to: { address: aviso.destinatario, name: '' },
      subject: contenido.asunto, text: contenido.texto, ...(contenido.html ? { html: contenido.html } : {}),
      messageId: `<${identificador}-${aviso.id}@gestioncapa.invalid>`,
      signal: AbortSignal.timeout(env.correoPlazoEnvioMs), ...(archivos ? { attachments: archivos } : {}),
    };
  } catch {
    return { estado: 'FALLIDO', codigo: 'CONTENIDO_INVALIDO' };
  }
  try {
    const envio = await transporte.sendMail(mensaje);
    return envio.accepted.length ? { estado: 'ENVIADO', codigo: null }
      : { estado: 'FALLIDO', codigo: 'SMTP_RECHAZADO' };
  } catch (error) {
    return resultadoError(error, aviso.intentos);
  }
}
