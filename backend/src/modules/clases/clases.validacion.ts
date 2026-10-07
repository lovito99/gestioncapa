import { z } from "zod";
import { camposDeError, textoObligatorio } from "../../shared/validacion.js";

export type DatosClase = {
  nombre: string;
  instructorId: number;
  /** YYYY-MM-DD, fecha local de Lima. */
  fecha: string;
  /** HH:mm, hora local de Lima. */
  horaInicio: string;
  horaFin: string;
  lugar: string;
};

export type ResultadoValidacion =
  | { ok: true; datos: DatosClase }
  | { ok: false; fields: Record<string, string> };

const largoMaximo = 160;
const formatoFecha = /^\d{4}-\d{2}-\d{2}$/;
const formatoHora = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Rechaza fechas con formato correcto que no existen, como 2030-02-30. */
function esFechaReal(fecha: string) {
  if (fecha.startsWith("0000-")) return false;
  const fechaUtc = new Date(`${fecha}T00:00:00Z`);
  return !Number.isNaN(fechaUtc.getTime()) && fechaUtc.toISOString().startsWith(fecha);
}

const esquemaClase = z.object({
  nombre: textoObligatorio("Ingresa el nombre de la clase")
    .pipe(z.string().max(largoMaximo, `El nombre admite hasta ${largoMaximo} caracteres`)),
  instructorId: z.preprocess(
    (valor) => typeof valor === "number" ? String(valor) : valor,
    textoObligatorio("Selecciona un instructor")
      .pipe(z.string().regex(/^\d{1,15}$/, "El instructor seleccionado no existe"))
      .refine((valor) => Number(valor) > 0, "El instructor seleccionado no existe")
      .transform(Number)
  ),
  fecha: textoObligatorio("Ingresa la fecha de la clase")
    .pipe(z.string().regex(formatoFecha, "Ingresa una fecha válida (AAAA-MM-DD)"))
    .refine(esFechaReal, "Ingresa una fecha válida (AAAA-MM-DD)"),
  horaInicio: textoObligatorio("Ingresa la hora de inicio")
    .pipe(z.string().regex(formatoHora, "Ingresa una hora válida (HH:mm)")),
  horaFin: textoObligatorio("Ingresa la hora de fin")
    .pipe(z.string().regex(formatoHora, "Ingresa una hora válida (HH:mm)")),
  lugar: textoObligatorio("Ingresa el lugar")
    .pipe(z.string().max(largoMaximo, `El lugar admite hasta ${largoMaximo} caracteres`))
}).refine(
  (datos) => !formatoHora.test(datos.horaInicio)
    || !formatoHora.test(datos.horaFin)
    || datos.horaFin > datos.horaInicio,
  { path: ["horaFin"], message: "La hora de fin debe ser posterior a la de inicio" }
);

/** Valida POST/PUT /clases con Zod, conservando el contrato del formulario. */
export function validarClase(entrada: unknown): ResultadoValidacion {
  const cuerpo = typeof entrada === "object" && entrada !== null && !Array.isArray(entrada) ? entrada : {};
  const resultado = esquemaClase.safeParse(cuerpo);
  return resultado.success
    ? { ok: true, datos: resultado.data }
    : { ok: false, fields: camposDeError(resultado.error) };
}

export const esquemaInscripcion = z.object({
  email: textoObligatorio("Ingresa el correo del participante")
    .pipe(z.email("Ingresa un correo válido"))
});
