import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { Mic } from 'lucide-react'
import { iniciales } from './iniciales'
import { BotonBarra, PanelPermisos } from './piezasSala'

describe('SCRUM-208 · piezas de la sala (Figma S3 9.x)', () => {
  it('arma las iniciales del avatar con la primera y la última palabra', () => {
    expect(iniciales('María Elena Quispe')).toBe('MQ')
    expect(iniciales('Invitado')).toBe('I')
    expect(iniciales('  ')).toBe('?')
  })

  it('el panel de permisos ofrece los interruptores del diseño y la sala de espera siempre activa', () => {
    const html = renderToStaticMarkup(<PanelPermisos valor={{ pantalla: false, microfono: false, camara: true, mano: true }} disponible ocupado={false} alCambiar={() => {}} alCerrar={() => {}} />)
    for (const texto of ['Permisos de los participantes', 'Compartir pantalla', 'Activar su micrófono', 'Activar su cámara', 'Levantar la mano', 'Sala de espera', 'Los cambios se aplican al instante']) expect(html).toContain(texto)
    expect(html.match(/role="switch"/g)).toHaveLength(5)
    expect(html.match(/aria-checked="true"/g)).toHaveLength(3)
  })

  it('sin moderación del servidor desactiva micrófono, cámara y pantalla y lo explica', () => {
    const html = renderToStaticMarkup(<PanelPermisos valor={{ pantalla: true, microfono: true, camara: true, mano: true }} disponible={false} ocupado={false} alCambiar={() => {}} alCerrar={() => {}} />)
    expect(html).toContain('Moderación no disponible')
    expect(html.match(/disabled=""/g)!.length).toBeGreaterThanOrEqual(4)
  })

  it('los botones de la barra muestran su etiqueta y el estado presionado', () => {
    const html = renderToStaticMarkup(<BotonBarra etiqueta="Micrófono" activo presionado icono={<Mic />} />)
    expect(html).toContain('Micrófono')
    expect(html).toContain('aria-pressed="true"')
  })
})
