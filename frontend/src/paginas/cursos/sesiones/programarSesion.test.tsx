import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { hora12 } from '@/lib/formato'
import type { SesionCurso } from '@/servicios/cursos'
import { Interruptor } from '@/components/ui/Interruptor'
import { lugarSesion, sesionesProgramadas, validarSesion, type Valores } from './reglasSesion'

const sala = { grabacionPrevista: false, pantallaPermitida: false, microfonoPermitido: false, manoPermitida: true, porcentajeMinimo: 70 }
const valores: Valores = { modalidad: 'PRESENCIAL', fecha: '2038-12-07', horaInicio: '09:00', horaFin: '13:00', sede: 'Sede CPPP Cusco · Av. La Cultura 1112',
  aula: 'Aula 3, segundo piso', encargadoId: 'i-1', qrRotatorio: false, sala }

describe('SCRUM-202 · S3 6.1 Programar sesión', () => {
  it('una presencial sin sede ni aula muestra «Falta completar el lugar» y los dos errores del Figma', () => {
    const { errores, aviso } = validarSesion({ ...valores, sede: '', aula: ' ' })
    expect(aviso?.titulo).toBe('Falta completar el lugar')
    expect(errores).toEqual({ sede: 'Selecciona la sede.', aula: 'Escribe el aula o una referencia.' })
  })

  it('la virtual no pide lugar ni encargado; «ambas» sí', () => {
    expect(validarSesion({ ...valores, modalidad: 'VIRTUAL', sede: '', aula: '', encargadoId: '' })).toEqual({ errores: {} })
    expect(validarSesion({ ...valores, modalidad: 'AMBAS', sede: '' }).errores.sede).toBe('Selecciona la sede.')
  })

  it('exige fecha y una hora de fin posterior a la de inicio', () => {
    const { errores, aviso } = validarSesion({ ...valores, fecha: '', horaFin: '09:00' })
    expect(aviso?.titulo).toBe('Revisa los datos de la sesión')
    expect(errores).toEqual({ fecha: 'Elige la fecha.', horaFin: 'Debe ser posterior a la hora de inicio.' })
  })

  it('el interruptor es un switch accesible con su estado', () => {
    const html = renderToStaticMarkup(<Interruptor titulo="Grabar la sesión" ayuda="Se avisará" activo onCambiar={() => {}} />)
    expect(html).toContain('role="switch"')
    expect(html).toContain('aria-checked="true"')
  })
})

describe('SCRUM-202 · S3 6.3 Sesiones del curso', () => {
  const base: SesionCurso = { id: '1', nombre: '', fecha: '2038-11-30', horaInicio: '09:00', horaFin: '12:00', lugar: 'Aula 3, sede CPPP Cusco', estado: 'PROGRAMADA', modalidad: 'AMBAS', reunion: null }

  it('ordena por fecha y oculta las canceladas', () => {
    const lista = sesionesProgramadas([base, { ...base, id: '2', fecha: '2038-11-16' }, { ...base, id: '3', estado: 'CANCELADA' }])
    expect(lista.map(s => s.id)).toEqual(['2', '1'])
  })

  it('describe el lugar según la modalidad y el mediodía como «12:00 m.»', () => {
    expect(lugarSesion(base)).toBe('Aula 3, sede CPPP Cusco y sala virtual')
    expect(lugarSesion({ ...base, modalidad: 'VIRTUAL' })).toBe('Sala virtual del CPPP')
    expect(lugarSesion({ ...base, modalidad: 'PRESENCIAL' })).toBe('Aula 3, sede CPPP Cusco')
    expect(`${hora12('09:00')} – ${hora12('12:00')}`).toBe('9:00 a. m. – 12:00 m.')
    expect(hora12('13:00')).toBe('1:00 p. m.')
  })
})
