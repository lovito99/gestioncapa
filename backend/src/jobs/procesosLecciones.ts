import type { FastifyInstance } from 'fastify';
import type { ConsultarYoutube } from '../providers/lecciones/youtubeProvider.js';
import { actualizarMetadatos, purgarMetadatosVencidos, videosPorVerificar } from '../repositories/lecciones/leccionesRepository.js';

export async function procesarLeccionesYoutube(consultar?: ConsultarYoutube) {
  const vencidas = await purgarMetadatosVencidos();
  let verificadas = 0;
  if (consultar) {
    for (let lote = 0; lote < 10; lote++) {
      const pendientes = await videosPorVerificar();
      if (!pendientes.length) break;
      const ids = pendientes.map(video => video.id);
      const duraciones = await consultar(ids);
      verificadas += await actualizarMetadatos(ids, ids.map(id => duraciones.get(id) ?? null), pendientes[0]!.consultadaEn);
      if (pendientes.length < 50) break;
    }
  }
  return { vencidas, verificadas };
}

export function iniciarProcesosLecciones(app: FastifyInstance, consultar?: ConsultarYoutube) {
  let pendiente: Promise<void> | null = null;
  function revisar() {
    if (pendiente) return;
    pendiente = procesarLeccionesYoutube(consultar).then(resultado => {
      if (resultado.vencidas || resultado.verificadas) app.log.info(resultado, 'Se revisó la vigencia de las lecciones.');
    }).catch(() => app.log.warn('La revisión de metadatos de lecciones no se completó. Se reintentará.'))
      .finally(() => { pendiente = null; });
  }
  const intervalo = setInterval(revisar, 60 * 60 * 1000);
  intervalo.unref();
  app.addHook('onClose', async () => {
    clearInterval(intervalo);
    await pendiente;
  });
  revisar();
}
