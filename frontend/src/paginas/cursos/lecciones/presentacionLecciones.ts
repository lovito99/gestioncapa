export function formatearDuracion(segundos: number | null) {
  if (segundos === null) return 'Duración no disponible'
  const horas = Math.floor(segundos / 3600)
  const minutos = Math.floor(segundos % 3600 / 60)
  const tiempo = segundos % 60
  return [horas ? `${horas} h` : '', minutos ? `${minutos} min` : '', tiempo || !horas && !minutos ? `${tiempo} s` : '']
    .filter(Boolean).join(' ')
}

export function moverLeccion(ids: string[], id: string, paso: -1 | 1) {
  const origen = ids.indexOf(id)
  const destino = origen + paso
  if (origen < 0 || destino < 0 || destino >= ids.length) return ids
  const siguiente = ids.slice()
  siguiente.splice(origen, 1)
  siguiente.splice(destino, 0, id)
  return siguiente
}
