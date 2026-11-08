import { z } from 'zod';
import { textoObligatorio } from '../../shared/validacion.js';
export class ErrorCertificado extends Error {
  constructor(readonly status: number, readonly code: string, mensaje: string) { super(mensaje); }
}
export const motivoCertificado = textoObligatorio('Ingresa el motivo.').pipe(z.string().max(1000, 'El motivo debe tener como máximo 1000 caracteres.'));
export const cierreEntrada = z.object({ excepciones: z.array(z.object({ agremiadoId: z.string().regex(/^[1-9]\d{0,14}$/), motivo: motivoCertificado }).strict()).max(500).default([]) }).strict();
export type DatosDocumento = {
  nombre: string; dniEnmascarado: string | null; curso: string; modalidad: string;
  horasLectivas: number; fechaInicio: string | null; fechaFin: string | null; instructorNombre: string;
  tipo: 'PARTICIPACION' | 'APROBACION'; demo: boolean;
};
export type FilaCierre = { agremiado: { id: string; nombre: string }; presentes: number; sesiones: number; porcentaje: number; cumple: boolean };
