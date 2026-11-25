type PasarelaRegistrada = {
  medio: string;
  ruta: string;
  altas: () => boolean;
  conciliacion: () => boolean;
};

export function crearRegistroPasarelas<T extends PasarelaRegistrada>(pasarelas: readonly T[]) {
  const medios = new Map(pasarelas.map(pasarela => [pasarela.medio, pasarela]));
  const rutas = new Map(pasarelas.map(pasarela => [pasarela.ruta, pasarela]));
  if (medios.size !== pasarelas.length || rutas.size !== pasarelas.length) {
    throw new Error('Hay identificadores de pasarela duplicados.');
  }
  return {
    porMedio: (medio: string) => medios.get(medio),
    porRuta: (ruta: string) => rutas.get(ruta),
    altas: () => pasarelas.filter(pasarela => pasarela.altas()),
    conciliables: () => pasarelas.filter(pasarela => pasarela.conciliacion()),
  };
}
