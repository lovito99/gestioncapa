import { setupServer } from 'msw/node'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { handlers } from './handlers'

/**
 * Sprint 3 (SCRUM-181/182, 185, 190/191, 193): contrato de portada, enlace para compartir,
 * precios de colegiado y general, y filtro de cobro del catálogo. Especificación para el backend.
 */
const BASE = 'http://localhost/api'
const servidor = setupServer(...handlers)
beforeAll(() => servidor.listen({ onUnhandledFrame: 'error' }))
afterAll(() => servidor.close())

async function llamar(metodo: string, ruta: string, usuario?: string, cuerpo?: unknown) {
  const respuesta = await fetch(`${BASE}${ruta}`, {
    method: metodo,
    headers: { 'Content-Type': 'application/json', ...(usuario ? { Authorization: `Bearer demo-${usuario}` } : {}) },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  })
  const texto = await respuesta.text()
  return { status: respuesta.status, cuerpo: texto ? JSON.parse(texto) : null }
}

const evaluacion = async () =>
  ((await llamar('GET', '/publico/cursos?buscar=Evaluaci%C3%B3n%20formativa')).cuerpo.items as { id: string }[])[0]!.id

describe('precios de colegiado y general', () => {
  it('el catálogo público muestra ambos precios', async () => {
    const curso = (await llamar('GET', '/publico/cursos?buscar=Evaluaci%C3%B3n%20formativa')).cuerpo.items[0]
    expect(curso).toMatchObject({ costo: 60, precioGeneral: 90, modalidadCobro: 'PREVIO', portadaUrl: null })
  })

  it('un colegiado del padrón paga el precio de colegiado', async () => {
    const { cuerpo } = await llamar('GET', `/cursos/${await evaluacion()}`, 'p-1')
    expect(cuerpo.miPrecio).toEqual({ tipo: 'COLEGIADO', importe: 60, dniParcial: '•••• 4567', enPadron: true })
  })

  it('el administrador guarda el precio general al cambiar el cobro', async () => {
    const id = await evaluacion()
    const actual = (await llamar('GET', `/cursos/${id}`, 'u-admin-1')).cuerpo
    const { status, cuerpo } = await llamar('PATCH', `/cursos/${id}/cobro`, 'u-admin-1', {
      modalidadCobro: 'PREVIO', costo: 60, precioGeneral: 95, plazoPagoMinutos: 4320, versionCobro: actual.versionCobro,
    })
    expect(status).toBe(200)
    expect(cuerpo.precioGeneral).toBe(95)
  })
})

describe('filtro de cobro del catálogo', () => {
  it('devuelve solo los cursos de esa modalidad de cobro', async () => {
    const certificado = (await llamar('GET', '/publico/cursos?cobro=CERTIFICADO')).cuerpo.items as { titulo: string }[]
    expect(certificado.map((c) => c.titulo)).toEqual(['Comprensión lectora en primaria'])
    expect((await llamar('GET', '/publico/cursos?cobro=OTRO')).status).toBe(422)
  })
})

describe('portada del curso', () => {
  it('el administrador sube y quita la portada', async () => {
    const id = await evaluacion()
    const png = btoa('imagen-de-prueba')
    const subida = await llamar('PUT', `/cursos/${id}/portada`, 'u-admin-1', { nombre: 'portada.png', tipo: 'image/png', contenidoBase64: png })
    expect(subida.status).toBe(200)
    expect(subida.cuerpo.portadaUrl).toBe(`data:image/png;base64,${png}`)
    expect((await llamar('DELETE', `/cursos/${id}/portada`, 'u-admin-1')).status).toBe(204)
    expect((await llamar('GET', `/cursos/${id}`, 'u-admin-1')).cuerpo.portadaUrl).toBeNull()
  })

  it('rechaza formatos no permitidos e imágenes de más de 1 MB', async () => {
    const id = await evaluacion()
    expect((await llamar('PUT', `/cursos/${id}/portada`, 'u-admin-1', { nombre: 'a.gif', tipo: 'image/gif', contenidoBase64: 'AAAA' })).cuerpo.fields.portada).toBeTruthy()
    const pesada = 'A'.repeat(1_500_000)
    expect((await llamar('PUT', `/cursos/${id}/portada`, 'u-admin-1', { nombre: 'b.png', tipo: 'image/png', contenidoBase64: pesada })).cuerpo.code).toBe('PORTADA_MUY_PESADA')
  })

  it('solo el administrador cambia la portada', async () => {
    expect((await llamar('PUT', `/cursos/${await evaluacion()}/portada`, 'p-1', { nombre: 'a.png', tipo: 'image/png', contenidoBase64: 'AAAA' })).status).toBe(403)
  })
})

describe('enlace para compartir', () => {
  it('es público y abre la página pública del curso', async () => {
    const id = await evaluacion()
    const { status, cuerpo } = await llamar('GET', `/publico/cursos/${id}/compartir`)
    expect(status).toBe(200)
    expect(cuerpo.url).toBe(`http://localhost/capacitaciones/${id}`)
    expect(cuerpo.enlaceCorto).toBe(`localhost/capacitaciones/${id}`)
  })

  it('no existe para cursos en borrador', async () => {
    const borrador = ((await llamar('GET', '/cursos', 'u-admin-1')).cuerpo as { id: string; estado: string }[]).find((c) => c.estado === 'BORRADOR')!
    expect((await llamar('GET', `/publico/cursos/${borrador.id}/compartir`)).status).toBe(404)
  })
})

describe('SCRUM-187 · página pública del curso', () => {
  it('sin sesión devuelve el curso publicado con sus sesiones, sin salas ni encargados', async () => {
    const id = await evaluacion()
    const { status, cuerpo } = await llamar('GET', `/publico/cursos/${id}`)
    expect(status).toBe(200)
    expect(cuerpo).toMatchObject({ id, titulo: expect.stringContaining('Evaluación formativa'), requisitoAsistencia: expect.any(Number), tipoCertificado: expect.any(String) })
    expect(Array.isArray(cuerpo.sesiones)).toBe(true)
    for (const sesion of cuerpo.sesiones) expect(Object.keys(sesion).sort()).toEqual(['fecha', 'horaFin', 'horaInicio', 'id', 'lugar', 'modalidad', 'nombre'])
    expect(cuerpo).not.toHaveProperty('modulos')
    expect(cuerpo).not.toHaveProperty('miInscripcion')
  })

  it('un curso inexistente o en borrador responde 404 CURSO_NO_EXISTE', async () => {
    const respuesta = await llamar('GET', '/publico/cursos/999999')
    expect(respuesta.status).toBe(404)
    expect(respuesta.cuerpo.code).toBe('CURSO_NO_EXISTE')
  })
})
