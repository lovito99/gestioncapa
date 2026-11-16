import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Boton } from '@/components/ui/Boton'
import { Campo } from '@/components/ui/Campo'
import { Entrada, Selector } from '@/components/ui/Entrada'
import { mensajeDeError } from '@/lib/api'
import { cursos, type DetalleCurso, type SesionEntrada } from '@/servicios/cursos'
import { entradaSesion, modalidadesSesion, type ModalidadSesion } from '@/servicios/modalidadCurso'
import { ETIQUETA_MODALIDAD_SESION } from './formatoCurso'
import { ListaSesiones } from './ListaSesiones'

export function SesionesCurso({ curso, administrador, participante }: { curso: DetalleCurso; administrador?: boolean; participante?: boolean }) {
  const cache = useQueryClient()
  const [aviso, cambiarAviso] = useState('')
  const [modalidad, cambiarModalidad] = useState<ModalidadSesion>('PRESENCIAL')
  const asistencia = useQuery({ queryKey: ['curso', curso.id, 'mi-asistencia'], queryFn: () => cursos.miAsistencia(curso.id), enabled: participante })
  const guardar = useMutation({
    mutationFn: (entrada: SesionEntrada) => cursos.programarSesion(curso.id, entrada),
    onSuccess: async () => {
      await Promise.all([cache.invalidateQueries({ queryKey: ['curso', curso.id] }), cache.invalidateQueries({ queryKey: ['clases'] })])
    },
  })
  const enviar = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault()
    const formulario = evento.currentTarget
    const entrada: SesionEntrada = entradaSesion(new FormData(formulario))
    cambiarAviso('')
    try {
      await guardar.mutateAsync(entrada)
      formulario.reset()
      cambiarModalidad('PRESENCIAL')
      cambiarAviso(entrada.modalidad === 'PRESENCIAL' ? 'Sesión programada.' : 'Sesión programada con su sala virtual.')
    } catch { /* El error se muestra junto al formulario. */ }
  }
  return <section aria-labelledby="sesiones-titulo" className="space-y-4 rounded-xl border border-line bg-white p-4 sm:p-5">
    <h2 id="sesiones-titulo" className="text-xl font-semibold">Sesiones del curso</h2>
    <div className="space-y-1 rounded-lg bg-brand-soft p-3">
      <p className="font-semibold">Requisito para obtener la constancia</p>
      <p>Asistencia mínima del {curso.requisitoAsistencia} % de las sesiones. En el aula virtual, la asistencia cuenta si estuviste conectado el tiempo mínimo que fija el instructor. Las sesiones canceladas no cuentan.</p>
      {curso.tipoCertificado === 'APROBACION' && <p>Para obtener el certificado de aprobación también necesitas una nota mínima de {curso.notaMinima}.</p>}
    </div>
    <ListaSesiones sesiones={curso.sesiones} />
    {participante && <div>
      {asistencia.isPending && <p role="status">Consultando tu asistencia…</p>}
      {asistencia.isError && <p role="alert" className="text-danger">No pudimos consultar tu asistencia. <button className="underline" onClick={() => void asistencia.refetch()}>Reintentar</button></p>}
      {asistencia.data && <p>Tu asistencia: {asistencia.data.presentes} de {asistencia.data.totalSesiones} sesiones ({asistencia.data.porcentaje.toLocaleString('es-PE', { maximumFractionDigits: 1 })} %). {asistencia.data.cumpleAsistencia ? 'Cumples el requisito de asistencia.' : 'Aún no cumples el requisito de asistencia.'}</p>}
    </div>}
    {administrador && <form onSubmit={e => void enviar(e)}>
      <fieldset disabled={guardar.isPending} className="grid min-w-0 gap-3 border-t border-line pt-4 sm:grid-cols-2">
        <legend className="mb-3 font-semibold">Programar sesión</legend>
        <Campo etiqueta="Nombre de la sesión" obligatorio className="sm:col-span-2"><Entrada name="nombre" required maxLength={160} /></Campo>
        <Campo etiqueta="Fecha de la sesión" obligatorio><Entrada name="fecha" type="date" required /></Campo>
        <Campo etiqueta="Modalidad de la sesión" obligatorio>
          <Selector name="modalidad" value={modalidad} onChange={evento => cambiarModalidad(evento.target.value as ModalidadSesion)}>
            {modalidadesSesion.map(valor => <option key={valor} value={valor}>{ETIQUETA_MODALIDAD_SESION[valor]}</option>)}
          </Selector>
        </Campo>
        {modalidad === 'VIRTUAL'
          ? <p className="self-end text-sm text-muted">Se creará su sala virtual con el mismo horario.</p>
          : <Campo etiqueta="Lugar de la sesión" obligatorio><Entrada name="lugar" required maxLength={160} /></Campo>}
        <Campo etiqueta="Hora de inicio de la sesión" obligatorio><Entrada name="horaInicio" type="time" required /></Campo>
        <Campo etiqueta="Hora de fin de la sesión" obligatorio><Entrada name="horaFin" type="time" required /></Campo>
        <Boton type="submit" className="justify-self-start" cargando={guardar.isPending}>Guardar sesión</Boton>
      </fieldset>
      {guardar.isError && <p role="alert" className="mt-3 text-danger">{mensajeDeError(guardar.error, 'No pudimos programar la sesión.')}</p>}
      {aviso && <p role="status" className="mt-3">{aviso}</p>}
    </form>}
  </section>
}
