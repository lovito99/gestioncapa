import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { expect, it, vi } from 'vitest'
import { api } from '@/lib/api'
import { cursos, type DetalleCurso, type FilaCertificado } from '@/servicios/cursos'
import { CertificadosCursoPagina } from './CertificadosCursoPagina'
import { CerrarCursoPagina } from './CerrarCursoPagina'

const curso: DetalleCurso = {
  id: '63', titulo: 'Enseñanza grabada', modalidad: 'GRABADO', tipoCertificado: 'APROBACION', estado: 'PUBLICADO',
  descripcion: '', instructorId: '10', instructorNombre: 'Elena Docente', horasLectivas: 24, costo: 0, cupos: 10,
  categoria: 'Educación', fechaInicio: null, fechaFin: null, cuposDisponibles: 8, notaMinima: 14, requisitoAsistencia: 80,
  modulos: [], sesiones: [],
}

const fila = { agremiado: { id: '12', nombre: 'Eva Colegiada' }, cumple: true, porExcepcion: false, certificado: null,
  evaluacion: { nota: 18, aprobado: true, avanceCompleto: true } } satisfies FilaCertificado & { evaluacion: object }

function mostrar(pagina: 'certificados' | 'cierre', datos: object) {
  const cache = new QueryClient()
  cache.setQueryData(['curso', curso.id, pagina], datos)
  return renderToStaticMarkup(<QueryClientProvider client={cache}>
    <MemoryRouter initialEntries={[`/admin/cursos/${curso.id}/${pagina}`]}>
      <Routes><Route path={`/admin/cursos/:id/${pagina}`} element={pagina === 'certificados' ? <CertificadosCursoPagina /> : <CerrarCursoPagina />} /></Routes>
    </MemoryRouter>
  </QueryClientProvider>)
}

it('HU19-07: permite evaluar una inscripción grabada aprobada y explica el avance incompleto', () => {
  const html = mostrar('certificados', { curso, evaluacionIndividual: true, filas: [fila, {
    ...fila, agremiado: { id: '13', nombre: 'Rocío Colegiada' }, cumple: false,
    evaluacion: { nota: null, aprobado: false, avanceCompleto: false },
  }] })
  expect(html).toContain('Evaluar inscripción de Eva Colegiada')
  expect(html).toContain('Nota: 18/20')
  expect(html).toContain('Lecciones pendientes')
  expect(html).not.toContain('Evaluar inscripción de Rocío Colegiada')
  expect(html).not.toContain('Emitir por excepción')
})

it('HU19-07: el cierre de aprobación con sesiones muestra la nota y omite la excepción académica', () => {
  const html = mostrar('cierre', { curso: { ...curso, modalidad: 'VIRTUAL' }, requisitoAsistencia: 80,
    filas: [{ ...fila, cumple: false, sesiones: 10, presentes: 10, porcentaje: 100,
      evaluacion: { nota: 12, aprobado: false, avanceCompleto: true } }] })
  expect(html).toContain('Nota: 12/20')
  expect(html).toContain('asistencia')
  expect(html).not.toContain('Emitir por excepción')
})

it('HU19-07: la evaluación administrativa envía la inscripción del colegiado al curso', async () => {
  const resultado = { codigo: null, retenida: true, pagoId: '72' }
  const publicar = vi.spyOn(api, 'post').mockResolvedValue({ data: resultado })
  try {
    await expect(cursos.evaluarInscripcion('63', '12')).resolves.toEqual(resultado)
    expect(publicar).toHaveBeenCalledWith('/cursos/63/evaluar-inscripcion', { agremiadoId: '12' })
  } finally {
    publicar.mockRestore()
  }
})
