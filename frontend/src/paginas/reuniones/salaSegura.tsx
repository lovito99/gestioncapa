import type { FormEvent } from 'react'
import type { AsistenciaReunion, ParticipanteAutorizado, PoliticasReunion, Reunion } from '@/servicios/reuniones'
import type { SolicitudEspera } from '@/servicios/salaJitsi'
import { Clock, X } from 'lucide-react'
import { politicasDesdeFormulario } from './politicasFormulario'
import { Avatar } from './piezasSala'

const estiloCampo = 'mt-1 block w-full rounded-lg border border-line bg-white p-2'
const estiloBoton = 'rounded-lg border border-line px-4 py-2 font-medium disabled:opacity-50'

/** HU-26: el instructor decide qué pueden hacer los colegiados en su sala. */
export function ConfiguracionReunion({ valor, estado, ocupado, alGuardar }: { valor: PoliticasReunion; estado: Reunion['estado']; ocupado: boolean; alGuardar: (politicas: PoliticasReunion) => void }) {
  const programada = estado === 'programada'
  const enviar = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault()
    alGuardar(politicasDesdeFormulario(new FormData(evento.currentTarget), valor.grabacionPrevista))
  }
  const medio = (nombre: string, etiqueta: string, permitido: boolean) => <label className="block text-sm">{etiqueta}
    <select name={nombre} defaultValue={permitido ? 'libre' : 'autorizar'} className={estiloCampo}>
      <option value="libre">Permitido a todos</option>
      <option value="autorizar">Solo con autorización del instructor</option>
    </select></label>
  return <form onSubmit={enviar} className="grid gap-3 rounded-lg border border-line p-4 sm:grid-cols-2" aria-label="Configuración de la sala">
    {medio('pantalla', 'Compartir pantalla', valor.pantallaPermitida)}
    {medio('microfono', 'Micrófono', valor.microfonoPermitido)}
    {medio('camara', 'Cámara', valor.camaraPermitida)}
    <label className="block text-sm">Conexión mínima para la asistencia (%)
      <input name="porcentajeMinimo" type="number" min={1} max={100} required defaultValue={valor.porcentajeMinimo} className={estiloCampo} /></label>
    <label className="flex items-center gap-2 text-sm"><input name="manoPermitida" type="checkbox" defaultChecked={valor.manoPermitida} />Levantar la mano</label>
    <label className="flex items-center gap-2 text-sm"><input name="grabacionPrevista" type="checkbox" defaultChecked={valor.grabacionPrevista} disabled={!programada} />La sesión se grabará (se avisará a los colegiados)</label>
    <p className="text-xs text-muted sm:col-span-2">Los colegiados entran siempre por la sala de espera. Si alguien comparte pantalla sin autorización, la sala lo silencia y lo expulsa.
      {!programada && ' El aviso de grabación solo se decide antes de iniciar.'}</p>
    <button disabled={ocupado} className={`${estiloBoton} sm:col-span-2`}>Guardar configuración</button>
  </form>
}

/** HU-26: resultado calculado al finalizar con los eventos del servidor Jitsi. */
export function AsistenciaReunionTabla({ datos }: { datos: AsistenciaReunion }) {
  return <section aria-label="Asistencia virtual" className="w-full overflow-x-auto">
    <p className="mb-2 text-sm">Mínimo: {datos.porcentajeMinimo} % de la sesión conectado. Las asistencias que cuentan suman al requisito del certificado.</p>
    {datos.resultados.length === 0 ? <p className="text-sm">No hay inscritos en esta sesión.</p> : <table className="w-full text-left text-sm">
      <thead><tr><th scope="col">Colegiado</th><th scope="col">Conectado</th><th scope="col">Porcentaje</th><th scope="col">Resultado</th></tr></thead>
      <tbody>{datos.resultados.map(fila => <tr key={fila.usuarioIdentificador} className="border-t border-line">
        <td className="py-1 pr-3">{fila.nombre}</td>
        <td className="pr-3">{Math.round(fila.segundosConectados / 60)} min</td>
        <td className="pr-3">{fila.porcentaje.toLocaleString('es-PE', { maximumFractionDigits: 2 })} %</td>
        <td>{fila.expulsado ? 'Expulsado' : fila.cuenta ? 'Cuenta' : 'No alcanza el mínimo'}</td>
      </tr>)}</tbody>
    </table>}
  </section>
}

/** HU-26 · S3 9.3: el moderador admite solo a quien la identidad del JWT señala como inscrito vigente. */
export function PanelSalaEspera({ solicitudes, inscritos, ocupado, alAdmitir, alRechazar, alAdmitirInscritos }: {
  solicitudes: SolicitudEspera[]; inscritos: ParticipanteAutorizado[]; ocupado: boolean
  alAdmitir: (identificador: string) => void; alRechazar: (identificador: string) => void; alAdmitirInscritos: () => void
}) {
  const persona = (solicitud: SolicitudEspera) => inscritos.find(inscrito => inscrito.identificador === solicitud.usuarioIdentificador)
  const admisibles = solicitudes.filter(solicitud => persona(solicitud)?.estado === 'autorizado').length
  return <section aria-label="Sala de espera" aria-live="polite" className="flex flex-col gap-2 rounded-lg bg-warning-soft p-3">
    <div className="flex items-center justify-between gap-2">
      <h2 className="flex items-center gap-1.5 text-sm font-semibold text-warning"><Clock className="size-4" aria-hidden />Sala de espera ({solicitudes.length})</h2>
      <button type="button" disabled={ocupado || admisibles === 0} onClick={alAdmitirInscritos}
        className="h-8 rounded-lg bg-white px-3 text-xs font-semibold text-brand ring-1 ring-brand ring-inset hover:bg-brand-soft disabled:opacity-50">Admitir a todos</button>
    </div>
    <ul className="flex flex-col gap-2">{solicitudes.map(solicitud => {
      const inscrito = persona(solicitud)
      const retirado = inscrito?.estado === 'retirado'
      const nombre = inscrito?.nombre ?? solicitud.nombre
      const detalle = !solicitud.usuarioIdentificador ? 'Identidad no verificada' : retirado ? 'Expulsado de esta sesión' : inscrito ? 'Inscrito' : 'No inscrito: no puede entrar'
      return <li key={solicitud.identificador} className="flex items-center gap-2">
        <Avatar nombre={nombre} oscuro />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm leading-5 text-ink">{nombre}</p>
          <p className={`text-xs leading-4 ${inscrito && !retirado ? 'text-success' : 'text-danger'}`}>{detalle}</p>
        </div>
        {inscrito && !retirado && <button type="button" disabled={ocupado} onClick={() => alAdmitir(solicitud.identificador)}
          className="h-8 rounded-lg bg-brand px-3 text-xs font-semibold text-white hover:bg-brand-ink disabled:opacity-50">Admitir</button>}
        <button type="button" disabled={ocupado} onClick={() => alRechazar(solicitud.identificador)} aria-label={`Rechazar a ${nombre}`}
          className="rounded p-1 text-brand hover:bg-white disabled:opacity-50"><X className="size-4" aria-hidden /></button>
      </li>
    })}</ul>
  </section>
}

/** Ley 29733 (AG-C01.2): el colegiado conoce la grabación antes de entrar. */
export function AvisoGrabacion({ aceptado, alCambiar }: { aceptado: boolean; alCambiar: (aceptado: boolean) => void }) {
  return <div className="flex flex-col gap-2 rounded-lg border border-brand bg-brand-soft p-4 text-sm text-ink">
    <p className="font-semibold text-brand">Esta sesión se grabará</p>
    <p>El instructor grabará la sesión para que los inscritos puedan repasarla. Tu nombre y, si los activas, tu cámara y micrófono pueden quedar en la grabación.</p>
    <label className="flex items-center gap-2"><input type="checkbox" checked={aceptado} onChange={evento => alCambiar(evento.target.checked)} className="size-4 accent-brand" />Entiendo y acepto que la sesión se grabe (Ley 29733).</label>
  </div>
}
