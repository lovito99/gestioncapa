import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useAuth } from '@/auth/useAuth'
import { mensajeDeError } from '@/lib/api'
import { reuniones, type PoliticasReunion, type Reunion } from '@/servicios/reuniones'
import { AsistenciaReunionTabla, ConfiguracionReunion } from './salaSegura'
export { SalaReunionPagina } from './SalaReunionPagina'

const estiloBoton = 'rounded-lg border border-line px-4 py-2 font-medium disabled:opacity-50'
const estados = { programada: 'Programada', iniciada: 'En curso', cancelada: 'Cancelada', finalizada: 'Finalizada' }
export function ReunionesPagina() {
  const { usuario } = useAuth()
  const consulta = useQuery({ queryKey: ['reuniones'], queryFn: reuniones.listar })
  const cliente = useQueryClient()
  const [mensaje, cambiarMensaje] = useState('')
  const [abierta, cambiarAbierta] = useState<{ identificador: string; vista: 'configuracion' | 'asistencia' } | null>(null)
  // El instructor crea la reunión de sus sesiones; el backend comprueba la asignación.
  const gestionar = usuario?.rol === 'ADMIN' || usuario?.rol === 'INSTRUCTOR'
  const actualizar = () => cliente.invalidateQueries({ queryKey: ['reuniones'] })
  const creacion = useMutation({ mutationFn: reuniones.crear, onSuccess: () => { void actualizar(); cambiarMensaje('Reunión creada. Revisa su configuración antes de iniciarla.') }, onError: error => cambiarMensaje(mensajeDeError(error, 'No se pudo crear la reunión.')) })
  const cambio = useMutation({ mutationFn: ({ identificador, accion }: { identificador: string; accion: string }) => reuniones.cambiarEstado(identificador, accion), onSuccess: () => { void actualizar() }, onError: error => cambiarMensaje(mensajeDeError(error, 'No se pudo cambiar el estado.')) })
  const configuracion = useMutation({ mutationFn: ({ identificador, politicas }: { identificador: string; politicas: PoliticasReunion }) => reuniones.guardarPoliticas(identificador, politicas),
    onSuccess: () => { void actualizar(); cambiarMensaje('Configuración guardada.') }, onError: error => cambiarMensaje(mensajeDeError(error, 'No se pudo guardar la configuración.')) })
  const enviar = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault()
    const datos = new FormData(evento.currentTarget)
    creacion.mutate({ claseIdentificador: String(datos.get('claseIdentificador')), titulo: String(datos.get('titulo')),
      inicioProgramado: new Date(String(datos.get('inicioProgramado'))).toISOString(), finProgramado: new Date(String(datos.get('finProgramado'))).toISOString() })
  }
  const alternar = (identificador: string, vista: 'configuracion' | 'asistencia') =>
    cambiarAbierta(actual => actual?.identificador === identificador && actual.vista === vista ? null : { identificador, vista })
  return <main className="mx-auto flex max-w-300 flex-col gap-6 p-4 sm:p-6">
    <h1 className="text-2xl font-semibold">Reuniones virtuales</h1>
    {gestionar && <form onSubmit={enviar} className="flex flex-wrap items-end gap-3 rounded-xl border border-line bg-white p-5">
      <label>Identificador de la sesión<input name="claseIdentificador" type="number" min="1" required className="block border p-2" /></label>
      <label>Título<input name="titulo" minLength={3} maxLength={160} required className="block border p-2" /></label>
      <label>Inicio (hora de tu dispositivo)<input name="inicioProgramado" type="datetime-local" required className="block border p-2" /></label>
      <label>Fin<input name="finProgramado" type="datetime-local" required className="block border p-2" /></label>
      <button disabled={creacion.isPending} className={estiloBoton}>Crear reunión</button>
    </form>}
    <p role="status">{mensaje}</p>
    {consulta.isPending && <p>Cargando reuniones…</p>}
    {consulta.error && <p role="alert">{mensajeDeError(consulta.error, 'No se pudieron cargar las reuniones.')}</p>}
    {consulta.data?.length === 0 && <p>No tienes reuniones programadas.</p>}
    {consulta.data?.map(reunion => <article key={reunion.identificador} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-line bg-white p-5">
      <div><h2 className="font-semibold">{reunion.titulo}</h2><p>{new Date(reunion.inicioProgramado).toLocaleString('es-PE')} · {estados[reunion.estado]}</p></div>
      <div className="flex flex-wrap gap-2">
        {reunion.estado === 'iniciada' && <Link className={estiloBoton} to={`/reuniones/${reunion.identificador}`}>Entrar a la sala</Link>}
        {gestionar && <>
          {reunion.estado === 'programada' && <button disabled={cambio.isPending} className={estiloBoton} onClick={() => cambio.mutate({ identificador: reunion.identificador, accion: 'iniciar' })}>Iniciar</button>}
          {(reunion.estado === 'programada' || reunion.estado === 'iniciada') && <button className={estiloBoton} aria-expanded={abierta?.identificador === reunion.identificador && abierta.vista === 'configuracion'} onClick={() => alternar(reunion.identificador, 'configuracion')}>Configurar sala</button>}
          {reunion.estado === 'iniciada' && <button disabled={cambio.isPending} className={estiloBoton} onClick={() => cambio.mutate({ identificador: reunion.identificador, accion: 'finalizar' })}>Finalizar y calcular asistencia</button>}
          {reunion.estado === 'programada' && <button disabled={cambio.isPending} className={estiloBoton} onClick={() => cambio.mutate({ identificador: reunion.identificador, accion: 'cancelar' })}>Cancelar</button>}
          {reunion.estado === 'finalizada' && <button className={estiloBoton} aria-expanded={abierta?.identificador === reunion.identificador && abierta.vista === 'asistencia'} onClick={() => alternar(reunion.identificador, 'asistencia')}>Ver asistencia virtual</button>}
        </>}
      </div>
      {abierta?.identificador === reunion.identificador && (abierta.vista === 'configuracion'
        ? <div className="w-full"><ConfiguracionReunion valor={reunion} estado={reunion.estado} ocupado={configuracion.isPending} alGuardar={politicas => configuracion.mutate({ identificador: reunion.identificador, politicas })} /></div>
        : <AsistenciaVirtual reunion={reunion} />)}
    </article>)}
  </main>
}

function AsistenciaVirtual({ reunion }: { reunion: Reunion }) {
  const consulta = useQuery({ queryKey: ['asistenciaReunion', reunion.identificador], queryFn: () => reuniones.asistencia(reunion.identificador) })
  if (consulta.isPending) return <p className="w-full">Cargando asistencia…</p>
  if (consulta.error) return <p role="alert" className="w-full">{mensajeDeError(consulta.error, 'No se pudo consultar la asistencia.')}</p>
  return <AsistenciaReunionTabla datos={consulta.data} />
}
