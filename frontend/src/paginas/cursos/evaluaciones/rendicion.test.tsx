// @vitest-environment happy-dom
import { act } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createRoot } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { expect, it, vi } from 'vitest'
import { AulaEvaluaciones } from './AulaEvaluacionesPagina'
import { FormularioRendicion, RendicionEvaluacionPagina } from './RendicionEvaluacionPagina'
import { ApiError } from '@/lib/api'
import { evaluaciones, type EvaluacionPublica, type IntentoEvaluacionEntrada } from '@/servicios/evaluaciones'

vi.mock('@/auth/useAuth', () => ({ useAuth: () => ({ usuario: { id: 'colegiado' } }) }))

const estado = { mejorNota: null, aprobado: false, intentosUsados: 0, intentosRestantes: 2, finalizado: false }
const evaluacion: EvaluacionPublica = {
  id: '12', titulo: 'Cuestionario de salida', oficial: true, notaMinima: 14, intentosMaximos: 2,
  bloqueada: false, estado, preguntas: [{
    id: 'pregunta', enunciado: '¿Cuál es la finalidad de la rúbrica?',
    opciones: [{ id: 'primera', texto: 'Guiar el aprendizaje' }, { id: 'segunda', texto: 'Asignar horarios' }],
  }],
}

it('HU19-05: el aula muestra lecciones pendientes y explica por qué no se puede rendir todavía', () => {
  const html = renderToStaticMarkup(<MemoryRouter><AulaEvaluaciones cursoId="42" aula={{
    titulo: 'Evaluación educativa', modalidad: 'GRABADO',
    lecciones: [{ id: '33', titulo: 'La rúbrica', modulo: 'Unidad 1', url: 'https://example.org/leccion.webm', completada: false }],
    evaluaciones: [{ ...evaluacion, bloqueada: true }],
  }} completar={() => {}} /></MemoryRouter>)
  expect(html).toContain('0 de 1')
  expect(html).toContain('Completar lección')
  expect(html).toContain('Completa todas las lecciones obligatorias')
  expect(html).not.toContain('href="/cursos/42/evaluaciones/12"')
})

it('HU19-03/04: el formulario ofrece una respuesta por pregunta y conserva el estado al agotar el límite', () => {
  const activa = renderToStaticMarkup(<FormularioRendicion evaluacion={evaluacion} enviar={async () => { throw Error('sin llamada') }} />)
  expect(activa.match(/type="radio"/g)).toHaveLength(2)
  expect(activa).toContain('Enviar respuestas')
  expect(activa).not.toContain('correcta')
  const final = renderToStaticMarkup(<FormularioRendicion evaluacion={{ ...evaluacion, estado: {
    ...estado, mejorNota: 16, aprobado: true, intentosUsados: 2, intentosRestantes: 0,
  } }} enviar={async () => { throw Error('sin llamada') }} />)
  expect(final).toContain('Intentos agotados')
  expect(final).toContain('Mejor nota')
  expect(final).toContain('16/20')
  expect(final).not.toContain('Enviar respuestas')
})

it('HU19-04: un envío sin confirmación puede repetirse con la misma operación cuando el cupo ya se consumió', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const contenedor = document.createElement('div')
  document.body.append(contenedor)
  const raiz = createRoot(contenedor)
  const final = { ...estado, mejorNota: 16, aprobado: true, intentosUsados: 2, intentosRestantes: 0 }
  const solicitudes: IntentoEvaluacionEntrada[] = []
  const enviar = async (entrada: IntentoEvaluacionEntrada) => {
    solicitudes.push(entrada)
    if (solicitudes.length === 1) throw new Error('Red interrumpida')
    return { nota: 16, aprobado: true, estado: final }
  }
  try {
    await act(() => raiz.render(<FormularioRendicion evaluacion={evaluacion} enviar={enviar} />))
    await act(async () => { contenedor.querySelector<HTMLInputElement>('input[type="radio"]')?.click() })
    await act(async () => { contenedor.querySelector('form')?.requestSubmit() })
    expect(solicitudes).toHaveLength(1)
    await act(() => raiz.render(<FormularioRendicion evaluacion={{ ...evaluacion, estado: final }} enviar={enviar} />))
    expect(contenedor.textContent).toContain('Reintentar envío')
    await act(async () => { contenedor.querySelector('form')?.requestSubmit() })
    expect(solicitudes).toHaveLength(2)
    expect(solicitudes[0]).toEqual(solicitudes[1])
    expect(contenedor.textContent).toContain('Nota del intento: 16/20')
  } finally {
    await act(() => raiz.unmount())
    contenedor.remove()
    vi.unstubAllGlobals()
  }
})

it('HU19-03: al perder acceso oculta las preguntas y la nota que ya estaban en pantalla', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const contenedor = document.createElement('div')
  const raiz = createRoot(contenedor)
  const cache = new QueryClient()
  const clave = ['evaluaciones', '42', 'colegiado', '12']
  cache.setQueryData(clave, { ...evaluacion, estado: { ...estado, mejorNota: 16 } })
  const consulta = vi.spyOn(evaluaciones, 'obtener').mockResolvedValue({ ...evaluacion, estado: { ...estado, mejorNota: 16 } })
  try {
    await act(async () => raiz.render(<QueryClientProvider client={cache}>
      <MemoryRouter initialEntries={['/cursos/42/evaluaciones/12']}>
        <Routes><Route path="/cursos/:id/evaluaciones/:evaluacionId" element={<RendicionEvaluacionPagina />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>))
    expect(contenedor.textContent).toContain('16/20')
    expect(contenedor.querySelector('input[type="radio"]')).not.toBeNull()
    consulta.mockRejectedValue(new ApiError(403, { code: 'SIN_PERMISO', message: 'Ya no tienes acceso.' }))
    await act(async () => { await cache.invalidateQueries({ queryKey: clave }) })
    await vi.waitFor(() => act(() => expect(contenedor.textContent).toContain('Ya no tienes acceso.')))
    expect(contenedor.textContent).not.toContain('16/20')
    expect(contenedor.querySelector('input[type="radio"]')).toBeNull()
  } finally {
    await act(() => raiz.unmount())
    cache.clear()
    consulta.mockRestore()
    vi.unstubAllGlobals()
  }
})
