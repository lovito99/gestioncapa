import type { FormEvent } from 'react'
import type { AsistenciaReunion, ParticipanteAutorizado, PoliticasReunion, Reunion } from '@/servicios/reuniones'
import type { SolicitudEspera } from '@/servicios/salaJitsi'
import { politicasDesdeFormulario } from './politicasFormulario'

const estiloCampo = 'mt-1 block w-full rounded-lg border border-line bg-white p-2'
const estiloBoton = 'rounded-lg border border-line px-4 py-2 font-medium disabled:opacity-50'
const botonSala = 'rounded-lg border border-slate-600 px-2 py-1 text-xs disabled:opacity-40'

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

/** HU-26: el moderador admite solo a quien la identidad del JWT señala como inscrito vigente. */
export function PanelSalaEspera({ solicitudes, inscritos, ocupado, alAdmitir, alRechazar, alAdmitirInscritos }: {
  solicitudes: SolicitudEspera[]; inscritos: ParticipanteAutorizado[]; ocupado: boolean
  alAdmitir: (identificador: string) => void; alRechazar: (identificador: string) => void; alAdmitirInscritos: () => void
}) {
  const persona = (solicitud: SolicitudEspera) => inscritos.find(inscrito => inscrito.identificador === solicitud.usuarioIdentificador)
  const admisibles = solicitudes.filter(solicitud => persona(solicitud)?.estado === 'autorizado').length
  return <section aria-label="Sala de espera" aria-live="polite" className="mb-5 rounded-xl border border-sky-400/60 bg-sky-400/10 p-3">
    <div className="mb-3 flex items-center justify-between gap-2">
      <h2 className="text-sm font-semibold text-sky-100">Sala de espera ({solicitudes.length})</h2>
      <button disabled={ocupado || admisibles === 0} className={`${botonSala} text-sky-100`} onClick={alAdmitirInscritos}>Admitir inscritos ({admisibles})</button>
    </div>
    <ul className="space-y-3">{solicitudes.map(solicitud => {
      const inscrito = persona(solicitud)
      const retirado = inscrito?.estado === 'retirado'
      return <li key={solicitud.identificador} className="text-sm">
        <p>{inscrito ? `${inscrito.nombre} · inscrito` : solicitud.nombre}</p>
        <p className="text-xs text-slate-400">{!solicitud.usuarioIdentificador ? 'Identidad no verificada' : retirado ? 'Expulsado de esta sesión' : inscrito ? `Se presentó como «${solicitud.nombre}»` : 'No figura entre los inscritos'}</p>
        <div className="mt-1 flex gap-2">
          {inscrito && !retirado && <button disabled={ocupado} className={`${botonSala} text-emerald-200`} onClick={() => alAdmitir(solicitud.identificador)}>Admitir</button>}
          <button disabled={ocupado} className={`${botonSala} text-red-200`} onClick={() => alRechazar(solicitud.identificador)}>Rechazar</button>
        </div>
      </li>
    })}</ul>
  </section>
}

/** Ley 29733 (AG-C01.2): el colegiado conoce la grabación antes de entrar. */
export function AvisoGrabacion({ aceptado, alCambiar }: { aceptado: boolean; alCambiar: (aceptado: boolean) => void }) {
  return <div className="mb-5 rounded-xl border border-amber-500/60 bg-amber-950 p-4 text-sm text-amber-100">
    <p className="font-semibold">Esta sesión se grabará</p>
    <p className="mt-1">El instructor grabará la sesión con fines de capacitación del CPPP. Tu imagen, voz y nombre pueden quedar registrados. Tratamos estos datos conforme a la Ley 29733 de Protección de Datos Personales.</p>
    <label className="mt-3 flex items-center gap-2"><input type="checkbox" checked={aceptado} onChange={evento => alCambiar(evento.target.checked)} />Leí el aviso y acepto entrar a la sesión grabada</label>
  </div>
}
