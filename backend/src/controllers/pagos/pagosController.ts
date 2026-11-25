import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import type { PagosService } from '../../services/pagos/pagosService.js';

type ConPago = FastifyRequest<{ Params: { id: string } }>;
type ConOperacion = FastifyRequest<{ Params: { id: string; operacionId: string } }>;
const privado = 'private, no-store';

export function pagosController(servicio: PagosService): FastifyPluginAsync {
  return async (app) => {
    app.post('/api/pagos/notificaciones/:proveedor', { bodyLimit: 262144 }, async (request: FastifyRequest<{ Params: { proveedor: string } }>, reply) => {
      const resultado = await servicio.notificar(request.params.proveedor, request.body, request.headers, request.ip);
      if ('limitada' in resultado) return reply.header('Retry-After', '60').code(429).send({ code: 'LIMITE_NOTIFICACIONES', message: 'Reintenta la notificación más tarde.' });
      return resultado;
    });

    app.post('/api/pagos/:id/conciliar', { bodyLimit: 4096 }, async (request: ConPago) => servicio.conciliar(request.params.id, request.usuario!, request.body));

    app.get('/api/pagos/:id', async (request: ConPago, reply) => {
      reply.header('Cache-Control', privado);
      return servicio.detalle(request.params.id, request.usuario!);
    });

    app.post('/api/pagos/:id/intentos', { bodyLimit: 4096 }, async (request: ConPago, reply) => {
      reply.header('Cache-Control', privado);
      return servicio.iniciarIntento(request.params.id, request.usuario!, request.body);
    });

    app.post('/api/pagos/:id/intentos/:operacionId/sesion', { bodyLimit: 4096 }, async (request: ConOperacion, reply) => {
      reply.header('Cache-Control', privado);
      return servicio.recuperarSesion(request.params.id, request.params.operacionId, request.usuario!);
    });

    app.get('/api/pagos/:id/comprobante', async (request: ConPago, reply) => {
      reply.header('Cache-Control', privado);
      const { pagoId, pdf } = await servicio.comprobante(request.params.id, request.usuario!);
      return reply.type('application/pdf').header('X-Content-Type-Options', 'nosniff')
        .header('Content-Disposition', `attachment; filename="comprobante-${pagoId}.pdf"`).send(pdf);
    });

    app.post('/api/pagos/:id/efectivo', { bodyLimit: 4096 }, async (request: ConPago, reply) => {
      const pago = await servicio.registrarEfectivo(request.params.id, request.usuario!, request.body);
      return reply.header('Cache-Control', privado).send(pago);
    });

    app.post('/api/pagos/:id/transferencias', { bodyLimit: 8 * 1024 * 1024 }, async (request: ConPago, reply) => {
      reply.header('Cache-Control', privado);
      const operacion = await servicio.declararConVoucher(request.params.id, request.usuario!, request.body);
      return reply.code(operacion.nueva ? 201 : 200).send({ operacionId: operacion.id, estado: operacion.estado });
    });

    app.get('/api/pagos/:id/transferencias/:operacionId/voucher', async (request: ConOperacion, reply) => {
      reply.header('Cache-Control', privado);
      const archivo = await servicio.voucher(request.params.id, request.params.operacionId, request.usuario!);
      // El voucher lo sube el participante: se sirve como descarga aislada, nunca como contenido activo.
      return reply.type(archivo.tipo).header('Content-Disposition', `attachment; filename="${archivo.nombre}"`)
        .header('X-Content-Type-Options', 'nosniff').header('Content-Security-Policy', "sandbox; default-src 'none'").send(archivo.contenido);
    });

    app.put('/api/pagos/:id/transferencias/:operacionId/voucher', { bodyLimit: 8 * 1024 * 1024 }, async (request: ConOperacion, reply) => {
      reply.header('Cache-Control', privado);
      return servicio.reponer(request.params.id, request.params.operacionId, request.usuario!, request.body);
    });

    app.post('/api/pagos/:id/transferencias/:operacionId/revision', { bodyLimit: 4096 }, async (request: ConOperacion, reply) => {
      reply.header('Cache-Control', privado);
      return servicio.revisar(request.params.id, request.params.operacionId, request.usuario!, request.body);
    });
  };
}
