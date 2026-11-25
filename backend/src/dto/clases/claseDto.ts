import { z } from "zod";
import { camposDeError, textoObligatorio } from "../../shared/validacion.js";
import { modalidadesSesion, type ModalidadSesion } from "../../entities/cursos/modalidad.js";
import type { DatosClase } from "../../entities/clases/clase.js";

export type ResultadoValidacion =
  | { ok: true; datos: DatosClase }
  | { ok: false; fields: Record<string, string> };

const largoMaximo = 160;
const formatoFecha = /^\d{4}-\d{2}-\d{2}$/;
const formatoHora = /^([01]\d|2[0-3]):[0-5]\d$/;
/** Lugar que se guarda cuando la sesión es solo virtual (la columna no admite vacío). */
export const lugarVirtual = "Aula virtual";

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
  lugar: z.preprocess(valor => typeof valor === "string" ? valor.trim() : valor ?? "",
    z.string({ error: "Ingresa el lugar" }).max(largoMaximo, `El lugar admite hasta ${largoMaximo} caracteres`)),
  modalidad: z.enum(modalidadesSesion, { error: "Elige si la sesión es presencial, virtual o ambas" })
}).superRefine((datos, contexto) => {
  // Solo la sesión virtual prescinde de un lugar físico.
  if (datos.modalidad !== "VIRTUAL" && !datos.lugar) contexto.addIssue({ code: "custom", path: ["lugar"], message: "Ingresa el lugar" });
}).transform(datos => ({ ...datos, lugar: datos.lugar || lugarVirtual })).refine(
  (datos) => !formatoHora.test(datos.horaInicio)
    || !formatoHora.test(datos.horaFin)
    || datos.horaFin > datos.horaInicio,
  { path: ["horaFin"], message: "La hora de fin debe ser posterior a la de inicio" }
);

/**
 * Valida POST/PUT /clases con Zod, conservando el contrato del formulario. Sin `modalidad`
 * se usa la de la ruta: PRESENCIAL al crear y la actual al editar (clientes anteriores a HU-36).
 */
export function validarClase(entrada: unknown, modalidadPorDefecto: ModalidadSesion = "PRESENCIAL"): ResultadoValidacion {
  const cuerpo: Record<string, unknown> = typeof entrada === "object" && entrada !== null && !Array.isArray(entrada) ? { ...entrada } : {};
  if (cuerpo.modalidad === undefined) cuerpo.modalidad = modalidadPorDefecto;
  const resultado = esquemaClase.safeParse(cuerpo);
  return resultado.success
    ? { ok: true, datos: resultado.data }
    : { ok: false, fields: camposDeError(resultado.error) };
}

export const esquemaInscripcion = z.object({
  email: textoObligatorio("Ingresa el correo del participante")
    .pipe(z.email("Ingresa un correo válido"))
});

/** Id de la URL; null si no es un entero positivo (se responde 404, no 500). */
export function leerIdClase(valor: string) {
  const id = Number(valor);
  return /^\d{1,15}$/.test(valor) && id > 0 ? id : null;
}
