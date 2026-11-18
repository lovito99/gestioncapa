import type { PoolClient } from 'pg';
import { env } from '../../config/env.js';
import { pool } from '../../shared/database.js';

import type { TipoPrecio } from './cursos.cobro.js';

const impedimentosInscripcion = {
  DNI_REQUERIDO: { estado: 403, mensaje: 'Registra tu DNI con el CPPP para poder inscribirte.' },
  PADRON_NO_DISPONIBLE: { estado: 503, mensaje: 'El padrón del CPPP no está disponible. Intenta más tarde.' },
  AFILIACION_INHABILITADA: { estado: 403, mensaje: 'Tu afiliación no está habilitada. Consulta con el CPPP.' },
  AFILIACION_NO_VERIFICADA: { estado: 403, mensaje: 'Valida el vínculo de tu cuenta con el CPPP para inscribirte.' },
  PRECIO_GENERAL_NO_CONFIGURADO: { estado: 409, mensaje: 'El administrador debe configurar el precio general de este curso.' },
} as const;
type CodigoImpedimento = keyof typeof impedimentosInscripcion;
type Cotizacion = { miPrecio: ReturnType<typeof precioDelTitular> } | ReturnType<typeof impedir>;

function impedir(codigo: CodigoImpedimento) {
  return { impedimentoInscripcion: { codigo, ...impedimentosInscripcion[codigo] } };
}

type Oferta = { costo: number; precioGeneral: number | null };
const padronVigente = `r.id=1 and r."validadoEn"<=statement_timestamp()
  and r."vigenteHasta">statement_timestamp() and exists(select 1 from "padronCppp")`;

export async function admiteInscripcionExterna() {
  if (!env.inscripcionExternaHabilitada) return false;
  return Boolean((await pool.query(`select 1 from "controlPadronCppp" r where ${padronVigente}`)).rowCount);
}

export function precioDelTitular(tipo: TipoPrecio, importe: number, dni: string | null) {
  return { tipo, importe, dniParcial: dni ? `•••• ${dni.slice(-4)}` : null, enPadron: tipo === 'COLEGIADO' };
}

export async function cotizarInscripcion(conexion: Pick<PoolClient, 'query'>, curso: Oferta, usuarioId: number, dni: string | null): Promise<Cotizacion> {
  if (!dni) return impedir('DNI_REQUERIDO');
  const { rows: [afiliacion] } = await conexion.query<{ habilitado: boolean | null; vinculado: boolean | null }>(
    `select p.habilitado, p."usuarioIdVerificado"=$2 as vinculado
     from "controlPadronCppp" r left join "padronCppp" p on p.dni=$1
     where ${padronVigente}`, [dni, usuarioId],
  );
  if (!afiliacion) return impedir('PADRON_NO_DISPONIBLE');
  if (afiliacion.habilitado === false) return impedir('AFILIACION_INHABILITADA');
  if (afiliacion.habilitado && !afiliacion.vinculado) return impedir('AFILIACION_NO_VERIFICADA');
  if (afiliacion.habilitado) return { miPrecio: precioDelTitular('COLEGIADO', curso.costo, dni) };
  const general = curso.precioGeneral ?? (curso.costo === 0 ? 0 : null);
  if (general === null) return impedir('PRECIO_GENERAL_NO_CONFIGURADO');
  return { miPrecio: precioDelTitular('GENERAL', general, dni) };
}
