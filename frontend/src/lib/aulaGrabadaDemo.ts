export const idCursoAulaDemo = '24001'
export const modoDemoActivo = import.meta.env.DEV && import.meta.env.VITE_USE_MOCKS === 'true'

export function cursoTieneAulaDemo(id: string) {
  return modoDemoActivo && id === idCursoAulaDemo
}
