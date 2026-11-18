import { createHash } from 'node:crypto';
import sharp, { type Sharp } from 'sharp';
import { z } from 'zod';

const maximoArchivo = 1024 * 1024;
const maximoBase64 = 4 * Math.ceil(maximoArchivo / 3);
const maximoPixeles = 16_000_000;
export const limiteCuerpoPortada = 1792 * 1024;

const esquemaPortada = z.object({
  nombre: z.string().trim().min(1).max(255),
  tipo: z.enum(['image/jpeg', 'image/png', 'image/webp']),
  contenidoBase64: z.string().min(1),
}).strict();

type VariantePortada = { archivo: Buffer; ancho: number };
export type PortadaProcesada = {
  version: string;
  miniatura: VariantePortada;
  tarjeta: VariantePortada;
  grande: VariantePortada;
};

export class ErrorPortada extends Error {
  constructor(readonly code: 'VALIDACION' | 'PORTADA_MUY_PESADA', message: string) {
    super(message);
  }
}

const errorFormato = () => new ErrorPortada('VALIDACION', 'Selecciona una imagen JPG, PNG o WebP válida.');
const errorPeso = () => new ErrorPortada('PORTADA_MUY_PESADA', 'La imagen de portada supera 1 MB.');
const firmaPng = Buffer.from('89504e470d0a1a0a', 'hex');

function coincideFormato(archivo: Buffer, tipo: z.infer<typeof esquemaPortada>['tipo']) {
  if (tipo === 'image/png') return archivo.subarray(0, 8).equals(firmaPng);
  if (tipo === 'image/jpeg') return archivo.subarray(0, 3).toString('hex') === 'ffd8ff';
  return archivo.toString('ascii', 0, 4) === 'RIFF' && archivo.toString('ascii', 8, 12) === 'WEBP';
}

function pngAnimado(archivo: Buffer) {
  // El decodificador PNG puede abrir solo el primer cuadro de un APNG.
  for (let inicio = 8; inicio + 12 <= archivo.length;) {
    if (archivo.toString('ascii', inicio + 4, inicio + 8) === 'acTL') return true;
    inicio += 12 + archivo.readUInt32BE(inicio);
  }
  return false;
}

async function codificar(imagen: Sharp, formato: 'webp' | 'jpeg', presupuesto: number) {
  for (const quality of [82, 66, 50, 34, 18, 5]) {
    const archivo = await imagen.clone().toFormat(formato, { quality }).toBuffer();
    if (archivo.length <= presupuesto) return archivo;
  }
  throw new ErrorPortada('VALIDACION', 'No pudimos optimizar la portada. Selecciona otra imagen.');
}

export async function procesarPortada(entrada: unknown): Promise<PortadaProcesada> {
  const resultado = esquemaPortada.safeParse(entrada);
  if (!resultado.success) throw errorFormato();
  const { tipo, contenidoBase64 } = resultado.data;
  if (contenidoBase64.length > maximoBase64) throw errorPeso();
  const archivo = Buffer.from(contenidoBase64, 'base64');
  if (archivo.length > maximoArchivo) throw errorPeso();
  if (archivo.toString('base64') !== contenidoBase64 || !coincideFormato(archivo, tipo)) throw errorFormato();

  const original = sharp(archivo, { failOn: 'warning', limitInputPixels: maximoPixeles });
  const metadatos = await original.metadata().catch(() => { throw errorFormato(); });
  if (`image/${metadatos.format}` !== tipo) throw errorFormato();
  if ((metadatos.pages ?? 1) > 1 || (tipo === 'image/png' && pngAnimado(archivo))) {
    throw new ErrorPortada('VALIDACION', 'Elige una imagen fija para la portada.');
  }
  const { width, height } = metadatos.autoOrient;
  if (!width || !height || width * 9 !== height * 16) {
    throw new ErrorPortada('VALIDACION', 'Usa una imagen en proporción 16:9, por ejemplo 1280 × 720.');
  }

  const { data, info } = await original.autoOrient()
    .resize({ width: 1280, withoutEnlargement: true })
    .toColourspace('srgb').raw().toBuffer({ resolveWithObject: true })
    .catch(() => { throw errorFormato(); });
  const imagen = sharp(data, { raw: { width: info.width, height: info.height, channels: info.channels } });
  const miniatura = {
    archivo: await codificar(imagen.clone().resize({ width: 352, withoutEnlargement: true }), 'webp', 90 * 1024),
    ancho: Math.min(352, info.width),
  };
  const tarjeta = {
    archivo: await codificar(imagen.clone().resize({ width: 704, withoutEnlargement: true }), 'webp', 180 * 1024),
    ancho: Math.min(704, info.width),
  };
  const grande = {
    archivo: await codificar(imagen.clone().resize({ width: 1280 }).flatten({ background: '#371724' }), 'jpeg', 384 * 1024),
    ancho: 1280,
  };
  const version = createHash('sha256').update(miniatura.archivo).update(tarjeta.archivo).update(grande.archivo).digest('hex');
  return { version, miniatura, tarjeta, grande };
}
