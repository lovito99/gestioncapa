export const variantesPortada = { miniatura: 'image/webp', tarjeta: 'image/webp', grande: 'image/jpeg' } as const;
export type VariantePortada = keyof typeof variantesPortada;
export type DatosPortada = { version: string; miniatura: number; tarjeta: number } | null;

type ArchivoVariante = { archivo: Buffer; ancho: number };
export type PortadaProcesada = {
  version: string;
  miniatura: ArchivoVariante;
  tarjeta: ArchivoVariante;
  grande: ArchivoVariante;
};

export function urlPortadaPrivada(id: string, version: string) {
  return `/api/cursos/${id}/portada?v=${version}`;
}

export const urlPortadaPublica = (id: string, version: string, variante: VariantePortada) =>
  `/api/publico/cursos/${id}/portada/${version}/${variante}`;

/** Sustituye los datos internos por enlaces: públicos si el curso está publicado y privados en otro caso. */
export function conPortada<T extends { id: string; estado: string; portadaDatos: DatosPortada }>({ portadaDatos, ...curso }: T) {
  if (!portadaDatos) return { ...curso, portadaUrl: null };
  const { version, miniatura, tarjeta } = portadaDatos;
  if (curso.estado !== 'PUBLICADO') return { ...curso, portadaUrl: urlPortadaPrivada(curso.id, version) };
  const portadaFuentes = [{ url: urlPortadaPublica(curso.id, version, 'miniatura'), ancho: miniatura }];
  if (tarjeta > miniatura) portadaFuentes.push({ url: urlPortadaPublica(curso.id, version, 'tarjeta'), ancho: tarjeta });
  return { ...curso, portadaUrl: urlPortadaPublica(curso.id, version, 'grande'), portadaFuentes };
}
