import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { setupServer } from 'msw/node'
import { handlersCursos } from './cursos'

const servidor = setupServer(...handlersCursos)
beforeAll(() => servidor.listen())
afterAll(() => servidor.close())
async function consultar(ruta: string, usuario = 'p-1') {
  return fetch(`http://localhost/api${ruta}`, { headers: { Authorization: `Bearer demo-${usuario}` } })
}

describe('Cursos de demostración', () => {
  it('el colegiado ve tres cursos publicados y no el borrador', async () => {
    const respuesta = await consultar('/catalogo/cursos')
    const catalogo = await respuesta.json()
    expect(respuesta.status).toBe(200)
    expect(catalogo).toHaveLength(3)
    expect(catalogo.every((c: { estado: string }) => c.estado === 'PUBLICADO')).toBe(true)
    expect(catalogo.some((c: { costo: number }) => c.costo === 0)).toBe(true)
    const borrador = (await (await consultar('/cursos', 'u-admin-1')).json()).find((c: { estado: string }) => c.estado === 'BORRADOR')
    expect((await consultar(`/cursos/${borrador.id}`)).status).toBe(403)
  })
  it('cada instructor ve sus cursos con módulos y materiales', async () => {
    const carlos = await (await consultar('/cursos', 'i-1')).json()
    const lucia = await (await consultar('/cursos', 'i-2')).json()
    expect(carlos).toHaveLength(2); expect(lucia).toHaveLength(2)
    const curso = await (await consultar(`/cursos/${carlos[0].id}`, 'i-1')).json()
    expect(curso.modulos.map((m: { orden: number }) => m.orden)).toEqual([1, 2])
    expect(curso.modulos.flatMap((m: { materiales: { tipo: string }[] }) => m.materiales.map(a => a.tipo))).toEqual(['PDF', 'ENLACE', 'VIDEO'])
  })
  it('el PDF de un curso publicado se puede descargar con sesión', async () => {
    const curso = (await (await consultar('/catalogo/cursos')).json())[0]
    const detalle = await (await consultar(`/cursos/${curso.id}`)).json()
    const modulo = detalle.modulos[0]
    const pdf = modulo.materiales.find((m: { tipo: string }) => m.tipo === 'PDF')
    const descarga = await consultar(`/cursos/${curso.id}/modulos/${modulo.id}/materiales/${pdf.id}/archivo`)
    expect(descarga.status).toBe(200)
    expect(descarga.headers.get('Content-Type')).toBe('application/pdf')
    const texto = await descarga.text()
    expect(texto).toMatch(/^%PDF-1\.4/)
    expect(texto).toContain('startxref')
  })
})
