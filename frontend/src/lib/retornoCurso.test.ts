import { describe,expect,it } from 'vitest'
import { accesoConCurso,cursoDeBusqueda,destinoTrasAcceso,loginDelCursoActual } from './retornoCurso'

describe('HU-22: selección de curso al autenticar',()=>{
  it('acepta un identificador del contrato del backend y construye rutas locales',()=>{
    expect(cursoDeBusqueda('?curso=42')).toBe('42')
    expect(cursoDeBusqueda('?curso=999999999999999')).toBe('999999999999999')
    expect(accesoConCurso('/login','42')).toBe('/login?curso=42')
    expect(accesoConCurso('/registro','42')).toBe('/registro?curso=42')
    expect(destinoTrasAcceso('?curso=42',undefined,'/participante/clases')).toBe('/cursos/42')
  })
  it.each(['','?curso=','?curso=0','?curso=01','?curso=-1','?curso=1.5','?curso=1000000000000000',
    '?curso=https://externo.example','?curso=//externo.example','?curso=%2Fadmin','?curso=%5Cexterno','?curso=%00',
    '?curso=42&curso=43','?curso=42&curso=42','?curso=%2042','?curso=42%20'])('descarta selección inválida: %s',busqueda=>{
    expect(cursoDeBusqueda(busqueda)).toBeNull()
    expect(destinoTrasAcceso(busqueda,undefined,'/catalogo')).toBe('/catalogo')
  })
  it('conserva retorno QR/inicio por rol y da prioridad a la selección explícita',()=>{
    const qr='/asistencia/marcar?token=abc.def-123'
    expect(destinoTrasAcceso('',qr,'/participante/clases')).toBe(qr)
    expect(destinoTrasAcceso('',undefined,'/admin')).toBe('/admin')
    expect(destinoTrasAcceso('?curso=42',qr,'/participante/clases')).toBe('/cursos/42')
    expect(destinoTrasAcceso('','https://externo.example','/catalogo')).toBe('/catalogo')
    expect(destinoTrasAcceso('','//externo.example','/catalogo')).toBe('/catalogo')
    expect(destinoTrasAcceso('','/\\externo.example','/catalogo')).toBe('/catalogo')
    expect(destinoTrasAcceso('','/\nexterno.example','/catalogo')).toBe('/catalogo')
    expect(destinoTrasAcceso('',42,'/catalogo')).toBe('/catalogo')
    expect(destinoTrasAcceso('',{desde:'/admin'},'/catalogo')).toBe('/catalogo')
  })
  it('un401 solo conserva la ruta exacta del curso y no acepta destinos ajenos',()=>{
    expect(loginDelCursoActual('/cursos/42')).toBe('/login?curso=42')
    for(const ruta of ['/admin','/login','/cursos/0','/cursos/42/editar','https://externo.example','/cursos/%2fexterno']) expect(loginDelCursoActual(ruta)).toBe('/login')
    expect(accesoConCurso('/login','//externo.example')).toBe('/login')
  })
  it('un401 durante la verificación de sesión conserva selección de login o registro',()=>{
    for(const ruta of ['/login','/registro']) {
      expect(loginDelCursoActual(ruta,'?curso=42')).toBe('/login?curso=42')
      expect(loginDelCursoActual(ruta,'?curso=42&curso=43')).toBe('/login')
      expect(loginDelCursoActual(ruta,'?curso=https://externo.example')).toBe('/login')
    }
  })
  it('reconoce las variantes del detalle que acepta el router sin abrir otras rutas',()=>{
    for(const ruta of ['/cursos/42/','/cursos/42//','/CURSOS/42','/cursos/%34%32']) expect(loginDelCursoActual(ruta)).toBe('/login?curso=42')
    for(const ruta of ['/login/','/registro/','/LOGIN']) expect(loginDelCursoActual(ruta,'?curso=42')).toBe('/login?curso=42')
    expect(loginDelCursoActual('/cursos/%')).toBe('/login')
    expect(loginDelCursoActual('/cursos/42%2f')).toBe('/login')
  })
})
