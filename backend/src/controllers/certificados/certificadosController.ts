import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { anulacionEntrada, cierreEntrada, correccionEntrada, esIdCurso, evaluacionInscripcionEntrada, excepcionEntrada, normalizarCodigo } from '../../dto/certificados/certificadoDto.js';
import type { CertificadosService } from '../../services/certificados/certificadosService.js';
import { ErrorAplicacion } from '../../shared/errorAplicacion.js';

type ConId = FastifyRequest<{ Params: { id: string } }>;
type ConCodigo = FastifyRequest<{ Params: { codigo: string } }>;

function validarId(id: string) {
  if (!esIdCurso(id)) throw new ErrorAplicacion(404, 'CURSO_NO_EXISTE', 'El curso no existe.');
}
const codigoDe = (request: ConCodigo) => normalizarCodigo(request.params.codigo);

export function certificadosController(servicio: CertificadosService): FastifyPluginAsync {
  return async (app) => {
    app.addHook('onRequest', async (request, reply) => { reply.header('Cache-Control', 'no-store'); });

    app.get('/api/cursos/:id/cierre', async (request: ConId) => {
      validarId(request.params.id); return servicio.vistaCierre(request.params.id, request.usuario!);
    });
    app.post('/api/cursos/:id/cerrar', async (request: ConId) => {
      validarId(request.params.id); const datos = cierreEntrada.parse(request.body ?? {});
      return servicio.cerrarCurso(request.params.id, request.usuario!, datos.excepciones);
    });
    app.get('/api/cursos/:id/certificados', async (request: ConId) => {
      validarId(request.params.id); return servicio.vistaCierre(request.params.id, request.usuario!, true);
    });
    app.post('/api/cursos/:id/evaluar-inscripcion', async (request: ConId) => {
      validarId(request.params.id);
      const { agremiadoId } = evaluacionInscripcionEntrada.parse(request.body);
      return servicio.evaluarInscripcion(request.params.id, agremiadoId, request.usuario!);
    });
    app.post('/api/cursos/:id/excepciones', async (request: ConId, reply) => {
      validarId(request.params.id);
      const datos = excepcionEntrada.parse(request.body);
      const certificado = await servicio.excepcionCerrado(request.params.id, datos.agremiadoId, datos.motivo, request.usuario!);
      return reply.code(201).send({ codigo: certificado.codigo, retenida: certificado.retenida, ...('pagoId' in certificado ? { pagoId: certificado.pagoId } : {}) });
    });

    app.get('/api/certificados/:codigo', async (request: ConCodigo) => servicio.verificar(codigoDe(request)));

    for (const archivo of [false, true]) app.get(`/api/certificados/:codigo/${archivo ? 'archivo' : 'documento'}`, async (request: ConCodigo, reply) => {
      const certificado = await servicio.documento(codigoDe(request), request.usuario!, archivo);
      if (archivo) {
        const nombre = certificado.datos.tipo === 'APROBACION' ? 'certificado' : 'constancia';
        return reply.type('application/pdf').header('Content-Disposition', `attachment; filename="${nombre}-${certificado.codigo}.pdf"`).send(certificado.archivo);
      }
      return { ...certificado.datos, codigo: certificado.codigo, estado: certificado.estado, reemplazadoPor: certificado.reemplazadoPor, emitidoEn: certificado.emitidoEn };
    });

    app.post('/api/certificados/:codigo/anular', async (request: ConCodigo, reply) => {
      const datos = anulacionEntrada.parse(request.body);
      await servicio.modificarCertificado(codigoDe(request), request.usuario!, datos.motivo);
      return reply.code(204).send();
    });
    app.post('/api/certificados/:codigo/corregir', async (request: ConCodigo, reply) => {
      const datos = correccionEntrada.parse(request.body);
      return reply.code(201).send(await servicio.modificarCertificado(codigoDe(request), request.usuario!, datos.motivo, datos.nombre));
    });
  };
}
