import { z } from 'zod';
import { duracionYoutube, esIdYoutube } from '../../entities/lecciones/youtube.js';
import { ErrorAplicacion } from '../../shared/errorAplicacion.js';

const respuestaYoutube = z.object({ items: z.array(z.object({
  id: z.string(),
  contentDetails: z.object({
    duration: z.string().optional(),
    contentRating: z.object({ ytRating: z.string().optional() }).optional(),
    regionRestriction: z.object({
      allowed: z.array(z.string()).optional(),
      blocked: z.array(z.string()).optional(),
    }).optional(),
  }),
  status: z.object({
    privacyStatus: z.string(), embeddable: z.boolean(), uploadStatus: z.string(), madeForKids: z.boolean().optional(),
  }),
  snippet: z.object({ liveBroadcastContent: z.string() }),
})).max(50) });

export function crearProveedorYoutube(clave: string | undefined, solicitar: typeof fetch = fetch) {
  return async (ids: string[]) => {
    if (!ids.length) return new Map<string, number>();
    if (!clave || ids.length > 50 || ids.some(id => !esIdYoutube(id))) throw noDisponible();
    const url = new URL('https://www.googleapis.com/youtube/v3/videos');
    url.searchParams.set('part', 'contentDetails,status,snippet');
    url.searchParams.set('id', ids.join(','));
    url.searchParams.set('fields',
      'items(id,contentDetails(duration,regionRestriction,contentRating/ytRating),status(privacyStatus,embeddable,uploadStatus,madeForKids),snippet/liveBroadcastContent)');
    let datos: z.infer<typeof respuestaYoutube>;
    try {
      const respuesta = await solicitar(url, {
        headers: { 'x-goog-api-key': clave },
        redirect: 'error',
        signal: AbortSignal.timeout(5000),
      });
      if (!respuesta.ok) {
        await respuesta.body?.cancel();
        throw noDisponible();
      }
      datos = respuestaYoutube.parse(await respuesta.json());
    } catch {
      throw noDisponible();
    }
    const duraciones = new Map<string, number>();
    const solicitados = new Set(ids);
    for (const item of datos.items) {
      if (!solicitados.has(item.id) || item.status.privacyStatus !== 'unlisted' ||
          item.status.uploadStatus !== 'processed' || !item.status.embeddable ||
          item.status.madeForKids || item.snippet.liveBroadcastContent !== 'none') continue;
      const region = item.contentDetails.regionRestriction;
      if (region?.blocked?.includes('PE') || (region?.allowed && !region.allowed.includes('PE')) ||
          item.contentDetails.contentRating?.ytRating === 'ytAgeRestricted') continue;
      const duracion = item.contentDetails.duration && duracionYoutube(item.contentDetails.duration);
      if (duracion) duraciones.set(item.id, duracion);
    }
    return duraciones;
  };
}

function noDisponible() {
  return new ErrorAplicacion(503, 'YOUTUBE_NO_DISPONIBLE',
    'No pudimos verificar el video con YouTube. Vuelve a intentarlo en unos minutos.');
}

export type ConsultarYoutube = ReturnType<typeof crearProveedorYoutube>;
