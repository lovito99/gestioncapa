import { crearPdfTexto } from '../../shared/pdf.js';
import { procesarColaCorreo } from '../notificaciones/correo.envio.js';

export function enviarNotificacionesPago() {
  return procesarColaCorreo('pagos', aviso => aviso.tipo === 'COMPROBANTE' ? [{
    filename: `comprobante-${aviso.pagoId}.pdf`, contentType: 'application/pdf',
    content: crearPdfTexto('Comprobante de recepción - CPPP', aviso.texto.split('\n')),
  }] : undefined);
}
