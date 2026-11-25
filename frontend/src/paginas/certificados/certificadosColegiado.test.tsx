// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/lib/api'
import type { CertificadoDocumento } from '@/servicios/certificados'
import { historiales, type Historial } from '@/servicios/historial'
import { CertificadoPagina } from './CertificadoPagina'
import { MisCertificadosPagina } from './MisCertificadosPagina'
import { VerificarCertificadoPagina } from './VerificarCertificadoPagina'

vi.mock('@/auth/useAuth', () => ({ useAuth: () => ({ usuario: { id: '12', rol: 'AGREMIADO' } }) }))

const curso: Historial['cursos'][number] = {
  id: '63', titulo: 'Enseñanza grabada', estado: 'TERMINADO', horasLectivas: 24, modalidad: 'GRABADO',
  inscritoEn: '2026-11-20T13:00:00Z', terminadoEn: '2026-11-21T13:00:00Z', requisitoAsistencia: 80,
  pagoPendiente: false, asistencia: { presentes: 0, realizadas: 0, porcentaje: null }, sesiones: [], certificados: [],
}

const vigente = { id: '15', cursoId: '63', codigo: 'CPPP-VIGENTE', tipo: 'APROBACION' as const,
  emitidoEn: '2026-11-21T13:00:00Z', horasLectivas: 24, estado: 'VALIDO' as const, nota: 18 }

const datos = { codigo: vigente.codigo, estado: 'VALIDO', tipo: 'APROBACION', nombre: 'Eva Colegiada',
  curso: 'Enseñanza grabada', modalidad: 'GRABADO', horasLectivas: 24, instructorNombre: 'Elena Docente',
  fechaInicio: null, fechaFin: null, dniEnmascarado: '****1234', reemplazadoPor: null, emitidoEn: '2026-11-21', nota: 18 } satisfies CertificadoDocumento

function mostrarListado(cursos: Historial['cursos']) {
  const cache = new QueryClient()
  cache.setQueryData(['historial', '12', '12'], { cursos })
  return renderToStaticMarkup(<QueryClientProvider client={cache}><MemoryRouter><MisCertificadosPagina /></MemoryRouter></QueryClientProvider>)
}

describe('HU19-08 Mis certificados', () => {
  it('enlaza el documento vigente y ofrece la descarga sobre el historial existente', () => {
    const html = mostrarListado([{ ...curso, certificados: [vigente, { ...vigente, id: '14', codigo: 'CPPP-ANTERIOR', estado: 'REEMPLAZADO' }] }])
    expect(html).toContain('Mis certificados')
    expect(html).toContain('Enseñanza grabada')
    expect(html).toContain('href="/certificados/CPPP-VIGENTE"')
    expect(html).toContain('Descargar certificado CPPP-VIGENTE')
    expect(html).toContain('Nota: 18/20')
    expect(html).not.toContain('CPPP-ANTERIOR')
  })

  it('informa que el documento retenido todavía no está listo y enlaza a su pago', () => {
    const html = mostrarListado([{ ...curso, estadoEntrega: 'RETENIDA', estadoFinanciero: 'PENDIENTE' }])
    expect(html).toContain('Enseñanza grabada')
    expect(html).toContain('retenido hasta confirmar el pago')
    expect(html).toContain('href="/cursos/63"')
    expect(html).not.toContain('Descargar certificado')
  })

  it('muestra un estado vacío cuando no hay documentos ni entregas pendientes', () => {
    expect(mostrarListado([curso])).toContain('Aún no tienes certificados disponibles.')
  })

  it('muestra la nota en el documento privado de aprobación', () => {
    const cache = new QueryClient()
    cache.setQueryData(['certificadoDocumento', '12', datos.codigo], datos)
    const html = renderToStaticMarkup(<QueryClientProvider client={cache}>
      <MemoryRouter initialEntries={[`/certificados/${datos.codigo}`]}>
        <Routes><Route path="/certificados/:codigo" element={<CertificadoPagina />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>)
    expect(html).toContain('Certificado de aprobación')
    expect(html).toContain('modalidad grabada')
    expect(html).toContain('Nota: 18/20')
  })

  it('muestra el rechazo cuando el servidor deniega la descarga', async () => {
    const cache = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } })
    cache.setQueryData(['historial', '12', '12'], { cursos: [{ ...curso, certificados: [vigente] }] })
    const denegacion = new ApiError(403, { code: 'SIN_PERMISO', message: 'No tienes permiso para descargar el certificado.' })
    const descargar = vi.spyOn(historiales, 'certificado').mockRejectedValue(denegacion)
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
    const contenedor = document.createElement('div')
    const raiz = createRoot(contenedor)
    try {
      await act(() => raiz.render(<QueryClientProvider client={cache}><MemoryRouter><MisCertificadosPagina /></MemoryRouter></QueryClientProvider>))
      const boton = contenedor.querySelector<HTMLButtonElement>(`[aria-label="Descargar certificado ${vigente.codigo}"]`)
      expect(boton).not.toBeNull()
      await act(() => boton?.click())
      expect(descargar).toHaveBeenCalledWith('12', vigente.id)
      await vi.waitFor(async () => {
        await act(async () => {})
        expect(contenedor.querySelector('[role="alert"]')?.textContent).toContain(denegacion.message)
      })
    } finally {
      await act(() => raiz.unmount())
      vi.unstubAllGlobals()
      descargar.mockRestore()
    }
  })

  it('la verificación pública muestra vigencia y curso sin nota ni DNI', () => {
    const cache = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } })
    cache.setQueryData(['certificado', datos.codigo], datos)
    const html = renderToStaticMarkup(<QueryClientProvider client={cache}>
      <MemoryRouter initialEntries={[`/verificar/${datos.codigo}`]}>
        <Routes><Route path="/verificar/:codigo" element={<VerificarCertificadoPagina />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>)
    expect(html).toContain('Válido')
    expect(html).toContain(datos.curso)
    expect(html).not.toContain('Nota: 18/20')
    expect(html).not.toContain(datos.dniEnmascarado)
  })
})
