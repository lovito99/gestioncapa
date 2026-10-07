export type DatosClase = {
  nombre: string;
  instructorId: number;
  /** `YYYY-MM-DD`, fecha local de Lima */
  fecha: string;
  /** `HH:mm`, hora local de Lima */
  horaInicio: string;
  horaFin: string;
  lugar: string;
};

export type ResultadoValidacion =
  | { ok: true; datos: DatosClase }
  | { ok: false; fields: Record<string, string> };

const LARGO_MAXIMO = 160;
const FORMATO_FECHA = /^\d{4}-\d{2}-\d{2}$/;
const FORMATO_HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

const texto = (valor: unknown) => (typeof valor === "string" ? valor.trim() : "");

/** Rechaza fechas con formato correcto que no existen, como 2030-02-30. */
function esFechaReal(fecha: string) {
  const fechaUtc = new Date(`${fecha}T00:00:00Z`);
  return !Number.isNaN(fechaUtc.getTime()) && fechaUtc.toISOString().startsWith(fecha);
}

/**
 * Valida el cuerpo de POST/PUT /clases sin depender del formulario.
 * Los mensajes coinciden con los de la interfaz y la simulación MSW.
 */
export function validarClase(entrada: unknown): ResultadoValidacion {
  const cuerpo = (typeof entrada === "object" && entrada !== null ? entrada : {}) as Record<string, unknown>;
  const fields: Record<string, string> = {};

  const nombre = texto(cuerpo.nombre);
  const instructorId = typeof cuerpo.instructorId === "number" ? String(cuerpo.instructorId) : texto(cuerpo.instructorId);
  const fecha = texto(cuerpo.fecha);
  const horaInicio = texto(cuerpo.horaInicio);
  const horaFin = texto(cuerpo.horaFin);
  const lugar = texto(cuerpo.lugar);

  if (!nombre) fields.nombre = "Ingresa el nombre de la clase";
  else if (nombre.length > LARGO_MAXIMO) fields.nombre = `El nombre admite hasta ${LARGO_MAXIMO} caracteres`;

  if (!instructorId) fields.instructorId = "Selecciona un instructor";
  else if (!/^\d{1,15}$/.test(instructorId)) fields.instructorId = "El instructor seleccionado no existe";

  if (!fecha) fields.fecha = "Ingresa la fecha de la clase";
  else if (!FORMATO_FECHA.test(fecha) || !esFechaReal(fecha)) fields.fecha = "Ingresa una fecha válida (AAAA-MM-DD)";

  if (!horaInicio) fields.horaInicio = "Ingresa la hora de inicio";
  else if (!FORMATO_HORA.test(horaInicio)) fields.horaInicio = "Ingresa una hora válida (HH:mm)";

  if (!horaFin) fields.horaFin = "Ingresa la hora de fin";
  else if (!FORMATO_HORA.test(horaFin)) fields.horaFin = "Ingresa una hora válida (HH:mm)";
  else if (FORMATO_HORA.test(horaInicio) && horaFin <= horaInicio) {
    fields.horaFin = "La hora de fin debe ser posterior a la de inicio";
  }

  if (!lugar) fields.lugar = "Ingresa el lugar";
  else if (lugar.length > LARGO_MAXIMO) fields.lugar = `El lugar admite hasta ${LARGO_MAXIMO} caracteres`;

  if (Object.keys(fields).length > 0) {
    return { ok: false, fields };
  }

  return {
    ok: true,
    datos: { nombre, instructorId: Number(instructorId), fecha, horaInicio, horaFin, lugar }
  };
}
