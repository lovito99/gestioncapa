import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { AsistenciaReunionTabla, AvisoGrabacion, ConfiguracionReunion, PanelSalaEspera } from './salaSegura'
import { politicasDesdeFormulario } from './politicasFormulario'

const politicas = { camaraPermitida: true, microfonoPermitido: true, pantallaPermitida: false, manoPermitida: true, porcentajeMinimo: 70, grabacionPrevista: false }

describe('HU26-06 configuración de la sala', () => {
  it('ofrece decidir pantalla, micrófono, cámara, mano, porcentaje y grabación', () => {
    const html = renderToStaticMarkup(<ConfiguracionReunion valor={politicas} estado="programada" ocupado={false} alGuardar={() => {}} />)
    for (const texto of ['Compartir pantalla', 'Micrófono', 'Cámara', 'Levantar la mano', 'Conexión mínima para la asistencia (%)', 'La sesión se grabará']) expect(html).toContain(texto)
    expect(html).toContain('value="70"')
  })
  it('no permite cambiar el aviso de grabación con la reunión iniciada', () => {
    const html = renderToStaticMarkup(<ConfiguracionReunion valor={politicas} estado="iniciada" ocupado={false} alGuardar={() => {}} />)
    expect(html.match(/<input[^>]*name="grabacionPrevista"[^>]*>/)?.[0]).toContain('disabled')
    expect(html).toContain('solo se decide antes de iniciar')
  })
  it('convierte el formulario en políticas sin aceptar porcentajes fuera de rango', () => {
    const datos = new FormData()
    for (const [clave, valor] of [['pantalla', 'autorizar'], ['microfono', 'libre'], ['camara', 'autorizar'], ['manoPermitida', 'on'], ['porcentajeMinimo', '75']]) datos.set(clave, valor)
    expect(politicasDesdeFormulario(datos, false)).toEqual({ pantallaPermitida: false, microfonoPermitido: true, camaraPermitida: false, manoPermitida: true, porcentajeMinimo: 75, grabacionPrevista: false })
    datos.set('porcentajeMinimo', '0')
    expect(() => politicasDesdeFormulario(datos, false)).toThrow(/entre 1 y 100/)
  })
})

describe('HU26-03/09 sala de espera del instructor', () => {
  const inscritos = [
    { identificador: '45', nombre: 'Ana', correo: 'a@p.pe', rol: 'participante', estado: 'autorizado' },
    { identificador: '46', nombre: 'Luis', correo: 'l@p.pe', rol: 'participante', estado: 'retirado' },
  ]
  it('muestra la identidad verificada y no ofrece admitir a expulsados ni a identidades desconocidas', () => {
    const html = renderToStaticMarkup(<PanelSalaEspera inscritos={inscritos} ocupado={false} alAdmitir={() => {}} alRechazar={() => {}} alAdmitirInscritos={() => {}} solicitudes={[
      { identificador: 'a', nombre: 'Nombre elegido', usuarioIdentificador: '45' },
      { identificador: 'b', nombre: 'Reintento', usuarioIdentificador: '46' },
      { identificador: 'c', nombre: 'Desconocido' },
      { identificador: 'd', nombre: 'Ajeno', usuarioIdentificador: '99' },
    ]} />)
    expect(html).toContain('Sala de espera (4)')
    expect(html).toContain('Ana')
    expect(html).toContain('Inscrito')
    expect(html).toContain('Expulsado de esta sesión')
    expect(html).toContain('Identidad no verificada')
    expect(html.match(/>Admitir</g)).toHaveLength(1)
    expect(html).toContain('Admitir a todos')
    expect(html).toContain('No inscrito: no puede entrar')
  })
})

describe('HU26-04 aviso de grabación', () => {
  it('informa la finalidad y la Ley 29733 antes de entrar', () => {
    const html = renderToStaticMarkup(<AvisoGrabacion aceptado={false} alCambiar={() => {}} />)
    expect(html).toContain('Esta sesión se grabará')
    expect(html).toContain('Ley 29733')
    expect(html).toContain('type="checkbox"')
  })
})

describe('HU26-15 resultado de asistencia virtual', () => {
  it('muestra minutos, porcentaje y si cuenta para el certificado', () => {
    const html = renderToStaticMarkup(<AsistenciaReunionTabla datos={{ porcentajeMinimo: 70, iniciadaEn: null, finalizadaEn: null, resultados: [
      { usuarioIdentificador: '1', nombre: 'Ana', segundosConectados: 3000, porcentaje: 83.33, cuenta: true, expulsado: false },
      { usuarioIdentificador: '2', nombre: 'Luis', segundosConectados: 600, porcentaje: 16.67, cuenta: false, expulsado: false },
      { usuarioIdentificador: '3', nombre: 'Eva', segundosConectados: 3600, porcentaje: 100, cuenta: false, expulsado: true },
    ] }} />)
    expect(html).toContain('Mínimo: 70 %')
    expect(html).toContain('50 min')
    expect(html).toContain('83.33 %')
    expect(html).toContain('Cuenta')
    expect(html).toContain('No alcanza el mínimo')
    expect(html).toContain('Expulsado')
  })
})
