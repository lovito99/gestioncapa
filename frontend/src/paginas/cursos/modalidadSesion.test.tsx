import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { ETIQUETA_MODALIDAD, ETIQUETA_MODALIDAD_SESION } from './formatoCurso'
import { ListaSesiones } from './ListaSesiones'
import { entradaSesion, modalidadDerivada } from '@/servicios/modalidadCurso'
import type { SesionCurso } from '@/servicios/cursos'

const base: SesionCurso = { id: '1', nombre: 'Sesión', fecha: '2034-03-10', horaInicio: '10:00', horaFin: '11:00', lugar: 'Auditorio CPPP', estado: 'PROGRAMADA', modalidad: 'PRESENCIAL', reunion: null }
const lista = (sesiones: SesionCurso[]) => renderToStaticMarkup(<MemoryRouter><ListaSesiones sesiones={sesiones} /></MemoryRouter>)

describe('HU36-03 modalidad del curso derivada de sus sesiones', () => {
  it('clasifica por sesiones programadas y conserva la planificada sin ellas', () => {
    expect(modalidadDerivada([], 'GRABADO')).toBe('GRABADO')
    expect(modalidadDerivada(['PRESENCIAL'], 'VIRTUAL')).toBe('PRESENCIAL')
    expect(modalidadDerivada(['VIRTUAL', 'VIRTUAL'], 'PRESENCIAL')).toBe('VIRTUAL')
    expect(modalidadDerivada(['VIRTUAL', 'VIRTUAL', 'VIRTUAL', 'VIRTUAL', 'PRESENCIAL'], 'PRESENCIAL')).toBe('HIBRIDA')
    expect(modalidadDerivada(['AMBAS'], 'PRESENCIAL')).toBe('HIBRIDA')
  })
  it('HU36-14 nombra el curso grabado y cada modalidad de sesión', () => {
    expect(ETIQUETA_MODALIDAD.GRABADO).toBe('Grabado')
    expect(ETIQUETA_MODALIDAD_SESION).toEqual({ PRESENCIAL: 'Presencial', VIRTUAL: 'Virtual en vivo', AMBAS: 'Presencial y virtual' })
  })
})

describe('HU36-05/08 presentación de cada sesión', () => {
  it('la presencial muestra lugar, fecha y horario, sin sala', () => {
    const html = lista([base])
    expect(html).toContain('Presencial')
    expect(html).toContain('Auditorio CPPP')
    expect(html).toContain('10/03/2034')
    expect(html).toContain('10:00–11:00')
    expect(html).not.toContain('sala')
  })
  it('la virtual muestra el acceso a la sala según su estado y no muestra el lugar', () => {
    const virtual = { ...base, modalidad: 'VIRTUAL' as const, lugar: 'Aula virtual' }
    const iniciada = lista([{ ...virtual, reunion: { identificador: 'abc', estado: 'iniciada' } }])
    expect(iniciada).toContain('Virtual en vivo')
    expect(iniciada).toContain('href="/reuniones/abc"')
    expect(iniciada).toContain('Entrar a la sala')
    expect(iniciada).not.toContain('Aula virtual')
    expect(lista([{ ...virtual, reunion: { identificador: 'abc', estado: 'programada' } }])).toContain('La sala se habilita al iniciar la sesión')
    expect(lista([virtual])).toContain('El acceso a la sala es para inscritos')
  })
  it('«ambas» muestra el aula y la sala; la cancelada no ofrece sala', () => {
    const ambas = lista([{ ...base, modalidad: 'AMBAS', reunion: { identificador: 'xyz', estado: 'iniciada' } }])
    expect(ambas).toContain('Presencial y virtual')
    expect(ambas).toContain('Auditorio CPPP')
    expect(ambas).toContain('href="/reuniones/xyz"')
    const cancelada = lista([{ ...base, modalidad: 'VIRTUAL', estado: 'CANCELADA', reunion: { identificador: 'xyz', estado: 'iniciada' } }])
    expect(cancelada).toContain('Cancelada')
    expect(cancelada).not.toContain('Entrar a la sala')
  })
})

describe('HU36-01/02 datos del formulario de sesión', () => {
  it('envía la modalidad y omite el lugar en las sesiones virtuales', () => {
    const datos = new FormData()
    for (const [clave, valor] of [['nombre', ' Sesión 1 '], ['fecha', '2034-03-10'], ['horaInicio', '10:00'], ['horaFin', '11:00'], ['lugar', 'Aula 2'], ['modalidad', 'VIRTUAL']]) datos.set(clave, valor)
    expect(entradaSesion(datos)).toEqual({ nombre: 'Sesión 1', fecha: '2034-03-10', horaInicio: '10:00', horaFin: '11:00', lugar: '', modalidad: 'VIRTUAL' })
    datos.set('modalidad', 'AMBAS')
    expect(entradaSesion(datos).lugar).toBe('Aula 2')
  })
})
