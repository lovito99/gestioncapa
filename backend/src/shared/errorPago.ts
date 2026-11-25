import { ErrorAplicacion } from "./errorAplicacion.js";

/**
 * Rechazo de una regla de cobro. Lo lanzan proveedores, repositorios y servicios de pagos;
 * el manejador global lo responde como cualquier ErrorAplicacion (`{ code, message }`).
 */
export class ErrorPago extends ErrorAplicacion {
  constructor(statusCode: number, code: string, mensaje: string) {
    super(statusCode, code, mensaje);
    this.name = "ErrorPago";
  }

  get statusCode() {
    return this.status;
  }
}
