import { z } from "zod";
import { ErrorAplicacion } from "./errorAplicacion.js";

/** Conserva el mensaje obligatorio cuando llega un valor ausente o de otro tipo. */
export function textoObligatorio(mensaje: string) {
  return z.preprocess(
    (valor) => typeof valor === "string" ? valor.trim() : "",
    z.string().min(1, mensaje)
  );
}

/** El frontend espera un único mensaje por campo, en español. */
export function camposDeError(error: z.ZodError) {
  const campos: Record<string, string> = {};
  for (const problema of error.issues) {
    const campo = problema.path[0];
    if (typeof campo === "string" && campos[campo] === undefined) {
      campos[campo] = problema.message;
    }
  }
  return campos;
}

/** La validación explícita evita registrar valores privados del formulario. */
export function validarEntrada<T>(esquema: z.ZodType<T>, entrada: unknown): T {
  const resultado = esquema.safeParse(entrada);
  if (resultado.success) return resultado.data;
  throw new ErrorAplicacion(422, "VALIDACION", "Revisa los campos indicados e intenta de nuevo.",
    { fields: camposDeError(resultado.error) });
}
