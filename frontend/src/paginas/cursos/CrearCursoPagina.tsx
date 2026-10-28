import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Boton } from '@/components/ui/Boton'
import { Campo } from '@/components/ui/Campo'
import { Entrada, Selector } from '@/components/ui/Entrada'
import { EnlaceVolver } from '@/components/ui/EnlaceVolver'
import { ApiError, mensajeDeError } from '@/lib/api'
import { cursos, type CursoEntrada } from '@/servicios/cursos'

export function CrearCursoPagina() {
  const navegar = useNavigate()
  const cache = useQueryClient()
  const instructores = useQuery({ queryKey: ['cursos', 'instructores'], queryFn: cursos.instructores })
  const [modulos, cambiarModulos] = useState([{ clave: 1, titulo: '' }])
  const [siguienteClave, cambiarClave] = useState(2)
  const crear = useMutation({ mutationFn: cursos.crear, onSuccess: async curso => { await cache.invalidateQueries({ queryKey: ['cursos'] }); navegar(`/cursos/${curso.id}`) } })
  const errores = crear.error instanceof ApiError ? crear.error.fields : {}
  const mover = (indice: number, destino: number) => cambiarModulos(actuales => {
    const nuevos = [...actuales]; [nuevos[indice], nuevos[destino]] = [nuevos[destino]!, nuevos[indice]!]; return nuevos
  })
  const guardar = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault()
    const datos = new FormData(evento.currentTarget)
    const texto = (campo: string) => String(datos.get(campo) ?? '').trim()
    crear.mutate({ titulo: texto('titulo'), descripcion: texto('descripcion'), instructorId: texto('instructorId'),
      horasLectivas: Number(texto('horasLectivas')), modalidad: texto('modalidad') as CursoEntrada['modalidad'],
      costo: Number(texto('costo')), cupos: Number(texto('cupos')), tipoCertificado: texto('tipoCertificado') as CursoEntrada['tipoCertificado'],
      ...(texto('notaMinima') === '' ? {} : { notaMinima: Number(texto('notaMinima')) }),
      modulos: modulos.map(({ titulo }) => ({ titulo })),
    })
  }
  return <div className="mx-auto max-w-200 space-y-5 px-4 py-6">
    <EnlaceVolver to="/cursos">Mis cursos</EnlaceVolver>
    <h1 className="text-2xl font-semibold">Crear curso</h1>
    <p>Se guardará en borrador. Podrás publicarlo después de revisarlo.</p>
    <form onSubmit={guardar} className="space-y-5 rounded-xl border border-line bg-white p-4">
      <fieldset disabled={crear.isPending} className="grid min-w-0 gap-4 sm:grid-cols-2">
        <Campo etiqueta="Título" obligatorio error={errores.titulo}><Entrada name="titulo" required maxLength={160} /></Campo>
        <Campo etiqueta="Instructor asignado" obligatorio error={errores.instructorId}><Selector name="instructorId" required disabled={instructores.isPending || instructores.isError} defaultValue="">
          <option value="" disabled>Selecciona un instructor</option>{instructores.data?.map(i => <option key={i.id} value={i.id}>{i.nombre}</option>)}
        </Selector></Campo>
        {instructores.isError && <p role="alert">No pudimos cargar instructores. <button type="button" className="underline" onClick={() => void instructores.refetch()}>Intentar de nuevo</button></p>}
        <Campo etiqueta="Descripción" error={errores.descripcion} className="sm:col-span-2"><Entrada name="descripcion" maxLength={5000} /></Campo>
        <Campo etiqueta="Horas lectivas" obligatorio error={errores.horasLectivas}><Entrada name="horasLectivas" type="number" required min="0.01" max="10000" step="any" /></Campo>
        <Campo etiqueta="Modalidad" obligatorio error={errores.modalidad}><Selector name="modalidad" required defaultValue=""><option value="" disabled>Selecciona modalidad</option><option value="PRESENCIAL">Presencial</option><option value="VIRTUAL">Virtual</option><option value="HIBRIDA">Híbrida</option></Selector></Campo>
        <Campo etiqueta="Costo (S/)" obligatorio error={errores.costo}><Entrada name="costo" type="number" required min="0" max="9999999999.99" step="0.01" /></Campo>
        <Campo etiqueta="Cupos" obligatorio error={errores.cupos}><Entrada name="cupos" type="number" required min="1" max="1000000" step="1" /></Campo>
        <Campo etiqueta="Tipo de certificado" obligatorio error={errores.tipoCertificado}><Selector name="tipoCertificado" required defaultValue=""><option value="" disabled>Selecciona certificado</option><option value="PARTICIPACION">Participación</option><option value="APROBACION">Aprobación</option></Selector></Campo>
        <Campo etiqueta="Nota mínima (0 a 20; por defecto 14)" error={errores.notaMinima}><Entrada name="notaMinima" type="number" min="0" max="20" step="any" placeholder="14" /></Campo>
      </fieldset>
      <fieldset disabled={crear.isPending} className="min-w-0 space-y-3">
        <legend className="mb-2 font-semibold">Módulos en orden de presentación</legend>
        {modulos.map((modulo, indice) => <div key={modulo.clave} className="flex flex-wrap items-end gap-2 rounded-lg border border-line p-3">
          <Campo etiqueta={`Módulo ${indice + 1}`} obligatorio className="min-w-0 flex-1 basis-48"><Entrada required maxLength={160} value={modulo.titulo} onChange={e => cambiarModulos(actuales => actuales.map(m => m.clave === modulo.clave ? { ...m, titulo: e.target.value } : m))} /></Campo>
          <Boton variante="secundario" disabled={indice === 0} aria-label={`Subir módulo ${indice + 1}`} onClick={() => mover(indice, indice - 1)}>↑</Boton>
          <Boton variante="secundario" disabled={indice === modulos.length - 1} aria-label={`Bajar módulo ${indice + 1}`} onClick={() => mover(indice, indice + 1)}>↓</Boton>
          <Boton variante="secundario" disabled={modulos.length === 1} aria-label={`Quitar módulo ${indice + 1}`} onClick={() => cambiarModulos(actuales => actuales.filter(m => m.clave !== modulo.clave))}>Quitar</Boton>
        </div>)}
        {errores.modulos && <p role="alert" className="text-danger">{errores.modulos}</p>}
        <Boton variante="secundario" disabled={modulos.length >= 100} onClick={() => { cambiarModulos(actuales => [...actuales, { clave: siguienteClave, titulo: '' }]); cambiarClave(n => n + 1) }}>Agregar módulo</Boton>
      </fieldset>
      {crear.isError && <p role="alert" className="text-danger">{mensajeDeError(crear.error, 'No pudimos guardar el curso.')}</p>}
      <Boton type="submit" cargando={crear.isPending} disabled={!instructores.data?.length}>Guardar borrador</Boton>
    </form>
  </div>
}
