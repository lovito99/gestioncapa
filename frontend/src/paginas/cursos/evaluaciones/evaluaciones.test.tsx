import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import { EditorEvaluacion } from './EditorEvaluacion'
import { PoliticaEvaluacionFormulario } from './PoliticaEvaluacionPagina'

it('HU19-01: el instructor puede preparar una pregunta y elegir una sola opción correcta', () => {
  const html = renderToStaticMarkup(<EditorEvaluacion modalidad="GRABADO"
    lecciones={[{ id: '32', titulo: 'Introducción', modulo: 'Evaluación', url: 'https://example.org/introduccion.webm' }]}
    guardar={async () => {}} ocupado={false} />)
  expect(html).toContain('Título de la evaluación')
  expect(html).toContain('Agregar pregunta')
  expect(html).toContain('Guardar borrador')
  expect(html).toContain('Enunciado')
  expect(html.match(/type="radio"/g)).toHaveLength(2)
  expect(html).toContain('Cuestionario oficial del curso')
  expect(html).not.toContain('Publicar evaluación')
})

it('HU19-02: el administrador ve las reglas guardadas y a qué publicaciones se aplican', () => {
  const html = renderToStaticMarkup(<PoliticaEvaluacionFormulario politica={{ notaMinima: 14, intentosMaximos: 2 }} guardar={async () => {}} />)
  expect(html).toContain('Nota mínima')
  expect(html).toContain('value="14"')
  expect(html).toContain('Intentos máximos')
  expect(html).toContain('value="2"')
  expect(html).toContain('evaluaciones que se publiquen')
})

