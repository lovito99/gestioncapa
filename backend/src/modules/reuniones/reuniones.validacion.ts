import { z } from "zod";

export const politicasReunion = z.object({
  camaraPermitida: z.boolean(),
  microfonoPermitido: z.boolean(),
  pantallaPermitida: z.boolean(),
  salaEsperaHabilitada: z.boolean()
}).strict();
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
