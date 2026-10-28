import { z } from 'zod';

const titulo = z.string({ error: 'Ingresa un título.' }).trim().min(1, 'Ingresa un título.').max(160, 'Usa como máximo 160 caracteres.');
export const idCurso = z.string({ error: 'Selecciona un identificador válido.' }).regex(/^[1-9]\d{0,14}$/, 'Identificador no válido.');
export const esquemaCurso = z.object({
  titulo,
  descripcion: z.string({ error: 'Ingresa una descripción válida.' }).trim().max(5000, 'Usa como máximo 5000 caracteres.').default(''),
  instructorId: idCurso,
  horasLectivas: z.number({ error: 'Indica las horas lectivas.' }).positive('Las horas lectivas deben ser mayores que cero.').max(10000, 'El máximo es 10000 horas.'),
  modalidad: z.enum(['PRESENCIAL', 'VIRTUAL', 'HIBRIDA'], { error: 'Selecciona una modalidad válida.' }),
  costo: z.number({ error: 'Indica un costo válido.' }).min(0, 'El costo no puede ser negativo.').max(9999999999.99, 'El costo supera el máximo permitido.').multipleOf(0.01, 'El costo admite hasta dos decimales.'),
  cupos: z.number({ error: 'Indica los cupos.' }).int('Los cupos deben ser enteros.').min(1, 'Indica al menos un cupo.').max(1000000, 'El máximo es 1000000 de cupos.'),
  tipoCertificado: z.enum(['PARTICIPACION', 'APROBACION'], { error: 'Selecciona el tipo de certificado.' }),
  notaMinima: z.number({ error: 'Indica una nota entre 0 y 20.' }).min(0, 'La nota mínima debe estar entre 0 y 20.').max(20, 'La nota mínima debe estar entre 0 y 20.').default(14),
  modulos: z.array(z.object({ titulo }).strict()).min(1, 'Agrega al menos un módulo.').max(100, 'El máximo es 100 módulos.'),
}).strict();
export type DatosCurso = z.infer<typeof esquemaCurso>;

const urlSegura = z.string().max(2048).url('Ingresa una URL válida.').refine(valor => {
  try { const url = new URL(valor); return url.protocol === 'https:' && !url.username && !url.password; } catch { return false; }
}, 'Usa una URL HTTPS sin credenciales.');
const pdf = z.string().max(6990508, 'El PDF no puede superar 5 MB.').regex(/^[A-Za-z0-9+/]*={0,2}$/, 'El archivo no es válido.').refine(valor => {
  if (valor.length > 6990508 || valor.length % 4 !== 0) return false;
  const archivo = Buffer.from(valor, 'base64');
  return archivo.toString('base64') === valor && archivo.length >= 5 && archivo.length <= 5242880 && archivo.subarray(0, 5).toString() === '%PDF-';
}, 'Selecciona un PDF válido de hasta 5 MB.');
export const esquemaMaterial = z.discriminatedUnion('tipo', [
  z.object({ titulo, tipo: z.literal('PDF'), contenidoBase64: pdf }).strict(),
  z.object({ titulo, tipo: z.literal('ENLACE'), url: urlSegura }).strict(),
  z.object({ titulo, tipo: z.literal('VIDEO'), url: urlSegura }).strict(),
]);
export type DatosMaterial = z.infer<typeof esquemaMaterial>;
