import { idCursoAulaDemo } from '@/lib/aulaGrabadaDemo'
import type { ModuloAula } from '@/servicios/aulaGrabada'

export const tituloAulaDemo = 'Retroalimentación que ayuda a aprender'

export const modulosAulaDemo: ModuloAula[] = [
  {
    id: 'evidencia',
    titulo: 'Recoger evidencias',
    actividades: [
      {
        id: 'leccion-evidencia', tipo: 'LECCION', titulo: 'Recoge una evidencia',
        resumen: 'Pide al estudiante que explique cómo llegó a su respuesta. Por ejemplo: «¿Qué paso te ayudó a resolverlo?»',
        video: new URL('./materialAula/evidencia.webm', import.meta.url).href,
      },
      {
        id: 'evaluacion-evidencia', tipo: 'EVALUACION', titulo: 'Evaluación · Evidencia',
        pregunta: '¿Qué evidencia ayuda a entender cómo aprendió el estudiante?',
        opciones: ['La cantidad de páginas del cuaderno', 'La explicación que da el estudiante', 'La hora a la que entregó la tarea'],
      },
    ],
  },
  {
    id: 'retroalimentacion',
    titulo: 'Dar retroalimentación',
    actividades: [
      {
        id: 'leccion-retroalimentacion', tipo: 'LECCION', titulo: 'Propón el siguiente paso',
        resumen: 'Describe lo que el estudiante logró. Luego indica qué puede mejorar. Por ejemplo: «Agrega un ejemplo que apoye tu idea».',
        video: new URL('./materialAula/retroalimentacion.webm', import.meta.url).href,
      },
      {
        id: 'evaluacion-retroalimentacion', tipo: 'EVALUACION', titulo: 'Evaluación · Retroalimentación',
        pregunta: '¿Qué aporta una retroalimentación que ayuda a mejorar?',
        opciones: ['Una calificación sin explicación', 'La comparación con el resto del aula', 'Un próximo paso concreto que el estudiante puede aplicar'],
      },
    ],
  },
]

export const actividadesAulaDemo = modulosAulaDemo.flatMap(modulo => modulo.actividades)
export const respuestasAulaDemo = new Map([['evaluacion-evidencia', 1], ['evaluacion-retroalimentacion', 2]])

const avanceSesion = new Map<string, number>()
const claveAvance = (usuarioId: string) => `gestioncapa:aula-demo:v1:${idCursoAulaDemo}:${usuarioId}`

export function avanceAulaDemo(usuarioId: string) {
  try {
    const valor = globalThis.localStorage?.getItem(claveAvance(usuarioId))
    if (valor != null && /^\d+$/.test(valor) && Number(valor) <= actividadesAulaDemo.length) return Number(valor)
  } catch {
    // La demo conserva el avance de la sesión cuando el navegador bloquea el almacenamiento.
  }
  return avanceSesion.get(usuarioId)
}

export function guardarAvanceAulaDemo(usuarioId: string, avance: number) {
  avanceSesion.set(usuarioId, avance)
  try {
    globalThis.localStorage?.setItem(claveAvance(usuarioId), String(avance))
  } catch {
    // El almacenamiento de sesión sigue disponible.
  }
}

export function completadasAulaDemo(avance: number) {
  return actividadesAulaDemo.slice(0, avance).map(actividad => actividad.id)
}
