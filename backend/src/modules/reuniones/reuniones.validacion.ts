import { z } from "zod";

/** Políticas que el instructor guarda y la sala aplica al conectarse el moderador (HU-26). */
export const politicasReunion = z.object({
  camaraPermitida: z.boolean(),
  microfonoPermitido: z.boolean(),
  pantallaPermitida: z.boolean(),
  manoPermitida: z.boolean(),
  porcentajeMinimo: z.number().int().min(1).max(100),
  grabacionPrevista: z.boolean()
}).strict();
export const solicitudCredencial = z.object({ aceptaGrabacion: z.boolean().optional() }).strict();
const camposReunion = z.object({
  claseIdentificador: z.coerce.number().int().positive().safe(),
  titulo: z.string().trim().min(3).max(160),
  inicioProgramado: z.iso.datetime({ offset: true }),
  finProgramado: z.iso.datetime({ offset: true })
}).strict();
const horarioValido = (datos: { inicioProgramado: string; finProgramado: string }) => Date.parse(datos.finProgramado) > Date.parse(datos.inicioProgramado);
export const editarReunion = camposReunion.omit({ claseIdentificador: true }).refine(horarioValido, {
  path: ["finProgramado"], message: "El fin debe ser posterior al inicio."
});
export const datosReunion = camposReunion.refine(horarioValido, {
  path: ["finProgramado"], message: "El fin debe ser posterior al inicio."
});
export const identificadorReunion = z.uuid();
