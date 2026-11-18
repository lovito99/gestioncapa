import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Boton } from '@/components/ui/Boton'
import { Aviso } from '@/components/ui/Aviso'
import { Selector } from '@/components/ui/Entrada'
import { Cargando, ErrorCarga } from '@/components/ui/Estados'
import { mensajeDeError } from '@/lib/api'
import {
  etiquetasEstadoCorreo, etiquetasTipoCorreo, notificacionesCorreo, type AvisoCorreo, type EstadoCorreo, type TipoCorreo,
} from '@/servicios/notificacionesCorreo'

const motivos: Record<string, string> = {
  SMTP_RESULTADO_INCIERTO: 'La aceptación no se pudo verificar. Consulta el registro SMTP antes de reenviar.',
  SMTP_RECHAZADO: 'El servidor SMTP rechazó el mensaje.',
  SMTP_FALLO_TEMPORAL: 'El servidor SMTP no aceptó el mensaje. Hay un reintento programado.',
  SMTP_INTENTOS_AGOTADOS: 'Se agotaron los intentos de envío.',
  SMTP_NO_ENTREGADO: 'El servidor no confirmó el envío.',
  DESTINATARIO_CAMBIADO: 'La cuenta está inactiva o su correo cambió.',
  CORREO_INVALIDO: 'La dirección de correo es inválida.',
  CONTENIDO_INVALIDO: 'No se pudo preparar el correo. Revisa la configuración del enlace.',
}

const fechaLima = new Intl.DateTimeFormat('es-PE', {
  dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Lima',
})
const hora = (fecha: string) => fechaLima.format(new Date(fecha))

function ResultadoCorreo({ aviso }: { aviso: AvisoCorreo }) {
  return (
    <li className="space-y-2 rounded-xl border border-line bg-white p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-semibold text-ink">{etiquetasTipoCorreo[aviso.tipo]}</h2>
        <span className="rounded bg-brand-soft px-2 py-1 text-sm font-medium text-ink">{etiquetasEstadoCorreo[aviso.estado]}</span>
      </div>
      <div className="flex flex-wrap gap-4 text-sm">
        <Link className="text-brand underline" to={'/cursos/' + aviso.cursoId}>Curso #{aviso.cursoId}</Link>
        {aviso.pagoId && <Link className="text-brand underline" to={'/admin/pagos?pago=' + aviso.pagoId}>Pago #{aviso.pagoId}</Link>}
      </div>
      <p className="text-sm text-muted">{aviso.intentos} {aviso.intentos === 1 ? 'intento' : 'intentos'} · Registrado el {hora(aviso.creadoEn)}</p>
      {aviso.enviadoEn && <p className="text-sm text-muted">Aceptación SMTP el {hora(aviso.enviadoEn)}</p>}
      {aviso.proximoIntentoEn && <p className="text-sm text-muted">Próximo intento desde el {hora(aviso.proximoIntentoEn)}</p>}
      {aviso.ultimoError && <p className="text-sm text-ink">{motivos[aviso.ultimoError] ?? 'El resultado requiere revisión.'}</p>}
      {aviso.estado === 'INCIERTO' && <p className="break-all text-xs text-muted">Identificador del aviso {aviso.id}</p>}
    </li>
  )
}

export function CorreosPagina() {
  const [tipo, setTipo] = useState<TipoCorreo | ''>('')
  const [estado, setEstado] = useState<EstadoCorreo | ''>('')
  const [pagina, setPagina] = useState(1)
  const correos = useQuery({
    queryKey: ['correos', tipo, estado, pagina],
    queryFn: () => notificacionesCorreo.listar({ tipo, estado, pagina }),
    refetchInterval: 30000,
  })

  return (
    <div className="mx-auto max-w-300 space-y-5 px-4 py-6 sm:px-10 sm:py-10">
      <h1 className="font-serif text-2xl font-bold text-ink">Notificaciones por correo</h1>
      <div className="grid gap-3 sm:max-w-xl sm:grid-cols-2">
        <label className="space-y-1 text-sm font-medium text-ink">
          <span>Tipo de aviso</span>
          <Selector value={tipo} onChange={event => { setTipo(event.target.value as TipoCorreo | ''); setPagina(1) }}>
            <option value="">Todos los tipos</option>
            {Object.entries(etiquetasTipoCorreo).map(([valor, texto]) => <option key={valor} value={valor}>{texto}</option>)}
          </Selector>
        </label>
        <label className="space-y-1 text-sm font-medium text-ink">
          <span>Estado</span>
          <Selector value={estado} onChange={event => { setEstado(event.target.value as EstadoCorreo | ''); setPagina(1) }}>
            <option value="">Todos los estados</option>
            {Object.entries(etiquetasEstadoCorreo).map(([valor, texto]) => <option key={valor} value={valor}>{texto}</option>)}
          </Selector>
        </label>
      </div>
      {correos.isPending ? <Cargando texto="Cargando notificaciones…" />
        : correos.isError ? <ErrorCarga mensaje={mensajeDeError(correos.error, 'No pudimos cargar las notificaciones.')} onReintentar={() => void correos.refetch()} />
          : <>
            {!correos.data.habilitado && <Aviso titulo="Envío pausado">Puedes consultar los avisos registrados.</Aviso>}
            <section aria-label="Resumen de envíos" className="space-y-1 text-sm text-ink">
              <p>Pendientes {correos.data.resumen.pendientes} · Fallidos {correos.data.resumen.fallidos} · Inciertos {correos.data.resumen.inciertos}</p>
              {correos.data.resumen.pendienteDesde && <p className="text-muted">Aviso pendiente más antiguo del {hora(correos.data.resumen.pendienteDesde)}</p>}
            </section>
            {correos.data.items.length === 0
              ? <p role="status" className="py-5 text-muted">No hay avisos para los filtros seleccionados.</p>
              : <ul aria-label="Avisos por correo" className="space-y-3">{correos.data.items.map(aviso => <ResultadoCorreo key={aviso.id} aviso={aviso} />)}</ul>}
            {(pagina > 1 || correos.data.haySiguiente) && <nav aria-label="Páginas de avisos" className="flex flex-wrap items-center gap-3">
              <Boton variante="secundario" disabled={pagina === 1} onClick={() => setPagina(pagina - 1)}>Anterior</Boton>
              <span className="text-sm text-muted">Página {pagina}</span>
              <Boton variante="secundario" disabled={!correos.data.haySiguiente} onClick={() => setPagina(pagina + 1)}>Siguiente</Boton>
            </nav>}
          </>}
    </div>
  )
}
