import { z } from 'zod';
import { textoObligatorio } from '../../shared/validacion.js';

export const motivoCertificado = textoObligatorio('Ingresa el motivo.').pipe(z.string().max(1000, 'El motivo debe tener como máximo 1000 caracteres.'));
export const cierreEntrada = z.object({ excepciones: z.array(z.object({ agremiadoId: z.string().regex(/^[1-9]\d{0,14}$/), motivo: motivoCertificado }).strict()).max(500).default([]) }).strict();
const agremiadoId = z.string().regex(/^[1-9]\d{0,14}$/, 'Selecciona un colegiado válido.');
export const evaluacionInscripcionEntrada = z.object({ agremiadoId }).strict();
export const excepcionEntrada = evaluacionInscripcionEntrada.extend({ motivo: motivoCertificado });
export const anulacionEntrada = z.object({ motivo: motivoCertificado }).strict();
export const correccionEntrada = z.object({ motivo: motivoCertificado, nombre: textoObligatorio('Ingresa el nombre corregido.').pipe(z.string().max(161, 'El nombre debe tener como máximo 161 caracteres.')) }).strict();

/** Código público sin espacios y en mayúsculas, como se imprime en la constancia. */
export const normalizarCodigo = (codigo: string) => codigo.trim().toUpperCase().replace(/\s+/g, '');
export const esCodigoCertificado = (codigo: string) => /^[A-Z0-9-]{4,100}$/.test(codigo);
export const esIdCurso = (id: string) => /^[1-9]\d{0,14}$/.test(id);
