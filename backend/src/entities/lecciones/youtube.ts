const idYoutube = /^[A-Za-z0-9_-]{11}$/;

export function esIdYoutube(id: string) {
  return idYoutube.test(id);
}

export function esEnlaceYoutube(valor: string) {
  const host = URL.parse(valor)?.hostname.replace(/\.$/, '') ?? '';
  return host === 'youtu.be' || host === 'youtube.com' || host.endsWith('.youtube.com') ||
    host === 'youtube-nocookie.com' || host.endsWith('.youtube-nocookie.com');
}

export function identificarVideoYoutube(valor: string) {
  const url = URL.parse(valor);
  if (url?.protocol !== 'https:' || url.username || url.password || url.port) return null;
  let id: string | undefined;
  if (url.hostname === 'youtu.be') {
    id = url.pathname.slice(1);
  } else if (['youtube.com', 'www.youtube.com', 'm.youtube.com'].includes(url.hostname) && url.pathname === '/watch') {
    const ids = url.searchParams.getAll('v');
    if (ids.length === 1) id = ids[0];
  }
  return id && esIdYoutube(id) ? id : null;
}

export function duracionYoutube(duracion: string) {
  const partes = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(duracion);
  if (!partes || duracion.endsWith('T')) return null;
  const dias = Number(partes[1] ?? 0);
  const horas = Number(partes[2] ?? 0);
  const minutos = Number(partes[3] ?? 0);
  const segundos = Number(partes[4] ?? 0);
  const total = dias * 86400 + horas * 3600 + minutos * 60 + segundos;
  return Number.isSafeInteger(total) && total > 0 && total <= 2147483647 ? total : null;
}
