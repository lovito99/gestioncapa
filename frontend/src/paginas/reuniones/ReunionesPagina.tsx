import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useAuth } from '@/auth/useAuth'
import { reuniones } from '@/servicios/reuniones'
export { SalaReunionPagina } from './SalaReunionPagina'

const estiloBoton = 'rounded-lg border border-line px-4 py-2 font-medium disabled:opacity-50'
export function ReunionesPagina() {
  const { usuario } = useAuth()
  const consulta = useQuery({ queryKey: ['reuniones'], queryFn: reuniones.listar })
  const cliente = useQueryClient()
  const [mensaje, cambiarMensaje] = useState('')
  const gestionar = usuario?.rol === 'ADMIN' || usuario?.rol === 'COORDINADOR'
  const creacion = useMutation({ mutationFn: reuniones.crear, onSuccess: () => { void cliente.invalidateQueries({ queryKey: ['reuniones'] }); cambiarMensaje('Reunión creada.') }, onError: error => cambiarMensaje(error.message) })
  const cambio = useMutation({ mutationFn: ({ identificador, accion }: { identificador: string; accion: string }) => reuniones.cambiarEstado(identificador, accion), onSuccess: () => { void cliente.invalidateQueries({ queryKey: ['reuniones'] }) }, onError: error => cambiarMensaje(error.message) })
  const enviar = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault()
    const datos = new FormData(evento.currentTarget)
    creacion.mutate({ claseIdentificador: String(datos.get('claseIdentificador')), titulo: String(datos.get('titulo')),
      inicioProgramado: new Date(String(datos.get('inicioProgramado'))).toISOString(), finProgramado: new Date(String(datos.get('finProgramado'))).toISOString() })
  }
  return <main className="mx-auto flex max-w-300 flex-col gap-6 p-6">
    <h1 className="text-2xl font-semibold">Reuniones virtuales</h1>
    {gestionar && <form onSubmit={enviar} className="flex flex-wrap items-end gap-3 rounded-xl border border-line bg-white p-5">
      <label>Identificador de clase<input name="claseIdentificador" type="number" min="1" required className="block border p-2" /></label>
      <label>Título<input name="titulo" minLength={3} maxLength={160} required className="block border p-2" /></label>
      <label>Inicio (hora de tu dispositivo)<input name="inicioProgramado" type="datetime-local" required className="block border p-2" /></label>
      <label>Fin<input name="finProgramado" type="datetime-local" required className="block border p-2" /></label>
      <button disabled={creacion.isPending} className={estiloBoton}>Crear reunión</button>
    </form>}
    <p role="status">{mensaje}</p>
    {consulta.isPending && <p>Cargando reuniones…</p>}
    {consulta.error && <p role="alert">{consulta.error.message}</p>}
    {consulta.data?.length === 0 && <p>No tienes reuniones programadas.</p>}
    {consulta.data?.map(reunion => <article key={reunion.identificador} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-line bg-white p-5">
      <div><h2 className="font-semibold">{reunion.titulo}</h2><p>{new Date(reunion.inicioProgramado).toLocaleString('es-PE')} · {reunion.estado}</p></div>
      <div className="flex gap-2">
        {reunion.estado === 'iniciada' && <Link className={estiloBoton} to={`/reuniones/${reunion.identificador}`}>Entrar a la sala</Link>}
        {(gestionar || usuario?.rol === 'INSTRUCTOR') && <>
          {reunion.estado === 'programada' && <button disabled={cambio.isPending} className={estiloBoton} onClick={() => cambio.mutate({ identificador: reunion.identificador, accion: 'iniciar' })}>Iniciar</button>}
          {reunion.estado === 'iniciada' && <button disabled={cambio.isPending} className={estiloBoton} onClick={() => cambio.mutate({ identificador: reunion.identificador, accion: 'finalizar' })}>Cerrar acceso a reunión</button>}
          {reunion.estado === 'programada' && <button disabled={cambio.isPending} className={estiloBoton} onClick={() => cambio.mutate({ identificador: reunion.identificador, accion: 'cancelar' })}>Cancelar</button>}
        </>}
      </div>
    </article>)}
  </main>
}
