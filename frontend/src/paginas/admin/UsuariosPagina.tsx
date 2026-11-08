import { useState, type FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api, mensajeDeError } from '@/lib/api'
import { Boton } from '@/components/ui/Boton'
import { Cargando, ErrorCarga } from '@/components/ui/Estados'

type Persona = { id: string; nombre: string; email: string; rol: 'admin' | 'instructor' | 'agremiado'; activo: boolean }
const nombresRol = { admin: 'Administrador', instructor: 'Instructor', agremiado: 'Agremiado' }
const entrada = 'min-h-11 w-full rounded border border-line bg-white px-3 text-ink'
export function UsuariosPagina() {
  const cache = useQueryClient()
  const [pagina, cambiarPagina] = useState(1)
  const [buscar, cambiarBuscar] = useState('')
  const [editar, cambiarEditar] = useState<Persona | null>(null)
  const [formulario, cambiarFormulario] = useState(false)
  const [guardando, cambiarGuardando] = useState(false)
  const [error, cambiarError] = useState('')
  const consulta = useQuery({ queryKey: ['usuarios',pagina,buscar], queryFn: async () => (await api.get<{ items: Persona[]; total: number }>('/usuarios',{ params: { pagina,buscar,tamanoPagina:20 } })).data })
  async function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault(); cambiarError(''); cambiarGuardando(true)
    const datos = new FormData(evento.currentTarget)
    const cuerpo = { nombre: String(datos.get('nombre')), email: String(datos.get('email')), rol: String(datos.get('rol')), activo: datos.get('activo')==='on', motivo: String(datos.get('motivo')) }
    try {
      if (editar) await api.put(`/usuarios/${editar.id}`,cuerpo)
      else await api.post('/usuarios',{ ...cuerpo,password:String(datos.get('password')) })
      await cache.invalidateQueries({ queryKey:['usuarios'] }); await cache.invalidateQueries({ queryKey:['colegiados'] })
      cambiarFormulario(false); cambiarEditar(null)
    } catch (fallo) { cambiarError(mensajeDeError(fallo,'No pudimos guardar el usuario. Revisa los datos e intenta de nuevo.')) }
    finally { cambiarGuardando(false) }
  }
  return <div className="mx-auto max-w-240 space-y-4 px-4 py-6 wrap-anywhere">
    <h1 className="text-2xl font-semibold">Usuarios del CPPP</h1>
    <label className="block">Buscar por nombre o correo<input className={entrada} value={buscar} onChange={e => { cambiarBuscar(e.target.value); cambiarPagina(1) }} /></label>
    <Boton onClick={() => { cambiarEditar(null); cambiarError(''); cambiarFormulario(true) }}>Crear usuario</Boton>
    {formulario && <form key={editar?.id ?? 'nuevo'} onSubmit={e => void guardar(e)} className="space-y-3 rounded-xl border border-line bg-white p-4">
      <h2 className="font-semibold">{editar ? 'Editar usuario' : 'Nuevo usuario'}</h2>
      <label className="block">Nombre<input className={entrada} name="nombre" defaultValue={editar?.nombre} required maxLength={120} /></label>
      <label className="block">Correo electrónico<input className={entrada} name="email" type="email" defaultValue={editar?.email} required maxLength={180} /></label>
      {!editar && <label className="block">Contraseña inicial<input className={entrada} name="password" type="password" autoComplete="new-password" minLength={8} required /></label>}
      <label className="block" htmlFor="rolUsuario">Rol</label><select id="rolUsuario" className={entrada} name="rol" defaultValue={editar?.rol ?? 'agremiado'}>{Object.entries(nombresRol).map(([valor,nombre]) => <option key={valor} value={valor}>{nombre}</option>)}</select>
      <label className="flex min-h-11 items-center gap-2"><input type="checkbox" name="activo" defaultChecked={editar?.activo ?? true} />Cuenta activa</label>
      <label className="block">Motivo del cambio<input className={entrada} name="motivo" required maxLength={1000} /></label>
      {error && <p role="alert" className="text-danger">{error}</p>}
      <div className="flex flex-wrap gap-3"><Boton type="submit" disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar usuario'}</Boton><Boton type="button" variante="secundario" disabled={guardando} onClick={() => cambiarFormulario(false)}>Cancelar</Boton></div>
    </form>}
    {consulta.isPending ? <Cargando /> : consulta.isError ? <ErrorCarga mensaje="No pudimos cargar los usuarios." onReintentar={consulta.refetch} /> : <>
      <ul className="space-y-3">{consulta.data.items.map(p => <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-white p-4"><div><p className="font-semibold">{p.nombre}</p><p>{p.email}</p><p>{nombresRol[p.rol]} · {p.activo ? 'Activo' : 'Inactivo'}</p></div><Boton variante="secundario" aria-label={`Editar ${p.nombre}`} onClick={() => { cambiarEditar(p); cambiarError(''); cambiarFormulario(true) }}>Editar</Boton></li>)}</ul>
      {!consulta.data.total && <p>No hay usuarios que coincidan con la búsqueda.</p>}
      <div className="flex items-center gap-3"><Boton variante="secundario" disabled={pagina===1} onClick={() => cambiarPagina(pagina-1)}>Anterior</Boton><span>Página {pagina}</span><Boton variante="secundario" disabled={pagina*20>=consulta.data.total} onClick={() => cambiarPagina(pagina+1)}>Siguiente</Boton></div>
    </>}
  </div>
}
