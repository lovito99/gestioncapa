import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { CobroCursoFormulario } from './CobroCursoFormulario'
import { validarCobro } from './reglasCurso'

describe('HU53-01 / SCRUM-190 formulario de cobro', () => {
  it('ofrece las tres modalidades, los dos precios y el plazo en días para pago previo', () => {
    const html = renderToStaticMarkup(<CobroCursoFormulario valor={{ modalidadCobro: 'PREVIO', costo: 60, precioGeneral: 90, plazoPagoMinutos: 4320 }} alCambiar={() => {}} />)
    expect(html).toContain('Pago antes de llevar el curso')
    expect(html).toContain('Pago solo por el certificado')
    expect(html).toContain('Gratuito')
    expect(html).toContain('Precio para colegiados (S/)')
    expect(html).toContain('Precio general (S/)')
    expect(html).toContain('Plazo para pagar después de inscribirse')
    expect(html).toContain('3 días')
  })

  it('no pide plazo para la constancia ni precios para un curso gratuito', () => {
    const html = renderToStaticMarkup(<CobroCursoFormulario valor={{ modalidadCobro: 'CERTIFICADO', costo: 30, precioGeneral: 50, plazoPagoMinutos: null }} alCambiar={() => {}} />)
    expect(html).toContain('Constancia para colegiados')
    expect(html).not.toContain('Plazo para pagar')
    const gratis = renderToStaticMarkup(<CobroCursoFormulario valor={{ modalidadCobro: 'GRATUITO', costo: 0, precioGeneral: 0, plazoPagoMinutos: null }} alCambiar={() => {}} />)
    expect(gratis).not.toContain('Precio general')
  })

  it('valida con los mensajes del Figma', () => {
    expect(validarCobro({ modalidadCobro: '', costo: Number.NaN, precioGeneral: Number.NaN, plazoPagoMinutos: null }).modalidadCobro).toBeTruthy()
    const errores = validarCobro({ modalidadCobro: 'PREVIO', costo: 60, precioGeneral: 0, plazoPagoMinutos: 4320 })
    expect(errores).toEqual({ precioGeneral: 'Ingresa el precio general. Si es igual al de colegiados, repite el monto.' })
    expect(validarCobro({ modalidadCobro: 'GRATUITO', costo: 0, precioGeneral: 0, plazoPagoMinutos: null })).toEqual({})
  })
})
