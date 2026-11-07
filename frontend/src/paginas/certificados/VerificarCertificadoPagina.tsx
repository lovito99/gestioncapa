import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { PaginaPublica } from '@/components/layout/Pagina'
import { Alerta } from '@/components/ui/Alerta'
import { Boton } from '@/components/ui/Boton'
import { Campo } from '@/components/ui/Campo'
import { Entrada } from '@/components/ui/Entrada'
import { Etiqueta } from '@/components/ui/Etiqueta'
import { esApiError, mensajeDeError } from '@/lib/api'
import { fechaCompleta } from '@/lib/formato'
import { CERTIFICADOS_CURSO } from '@/servicios/cursos'
import { normalizarCodigo, useCertificado, type CertificadoPublico, type EstadoCertificado } from '@/servicios/certificados'

const PRESENTACION: Record<EstadoCertificado, { etiqueta: string; tono: 'exito' | 'peligro' | 'advertencia' }> = {
  VALIDO: { etiqueta: 'Válido', tono: 'exito' },
  ANULADO: { etiqueta: 'Anulado', tono: 'peligro' },
  REEMPLAZADO: { etiqueta: 'Reemplazado', tono: 'advertencia' },
}

/**
 * 5.2 · Verificar certificado (pública). El QR del certificado abre `/verificar/:codigo`,
 * así el resultado (5.3 / 5.3a / 5.3b) aparece sin escribir nada.
 */
export function VerificarCertificadoPagina() {
  const { codigo: codigoRuta } = useParams()
  const codigo = codigoRuta ? normalizarCodigo(codigoRuta) : undefined
  const navegar = useNavigate()
  const [texto, cambiarTexto] = useState(codigo ?? '')
  const [errorCampo, cambiarErrorCampo] = useState('')
  const certificado = useCertificado(codigo)

  const verificar = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault()
    const escrito = normalizarCodigo(texto)
    if (!escrito) return cambiarErrorCampo('Escribe el código que aparece en el certificado.')
    cambiarErrorCampo('')
    if (escrito === codigo) void certificado.refetch()
    else navegar(`/verificar/${encodeURIComponent(escrito)}`)
  }

  return (
    <PaginaPublica>
      <div className="mx-auto flex w-full max-w-140 flex-col gap-4 px-4 pt-6 pb-8 sm:pt-10">
        <h1 className="text-[22px] font-bold text-ink">Verificar certificado</h1>
        <p className="text-sm text-muted">Escanea el QR del certificado o escribe su código.</p>

        <form onSubmit={verificar} noValidate className="flex flex-col gap-4">
          <Campo etiqueta="Código del certificado" error={errorCampo}>
            <Entrada
              value={texto}
              onChange={(e) => cambiarTexto(e.target.value)}
              placeholder="Ej.: CPPP-7K4M-Q9X2"
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              maxLength={64}
              estado={errorCampo ? 'error' : 'normal'}
              className="uppercase placeholder:normal-case sm:h-12 sm:text-base"
            />
          </Campo>
          <Boton type="submit" cargando={certificado.isFetching} className="h-12 w-full text-base">
            Verificar
          </Boton>
        </form>

        {certificado.isError ? (
          <Alerta tipo="error">
            {esApiError(certificado.error, 'CERTIFICADO_NO_EXISTE')
              ? 'No encontramos un certificado con ese código. Revisa que esté bien escrito.'
              : mensajeDeError(certificado.error, 'No pudimos verificar el certificado. Intenta de nuevo.')}
          </Alerta>
        ) : (
          certificado.data && !certificado.isFetching && <Resultado certificado={certificado.data} />
        )}
      </div>
    </PaginaPublica>
  )
}

function Resultado({ certificado }: { certificado: CertificadoPublico }) {
  const { etiqueta, tono } = PRESENTACION[certificado.estado]

  return (
    <section
      aria-live="polite"
      aria-label="Resultado de la verificación"
      className="flex flex-col gap-3 rounded-xl border border-line bg-white px-4 py-5 shadow-[0_1px_1px_rgba(0,0,0,0.05)]"
    >
      <p className="flex items-center gap-2 text-base font-semibold text-ink">
        Estado: <Etiqueta tono={tono} grande>{etiqueta}</Etiqueta>
      </p>

      {certificado.estado === 'VALIDO' ? (
        <Alerta tipo="exito">Este certificado es auténtico.</Alerta>
      ) : certificado.estado === 'ANULADO' ? (
        <div role="status" className="rounded-lg border border-danger bg-danger-soft px-4 py-3 text-sm text-danger">
          Este certificado fue anulado y no tiene validez.
        </div>
      ) : (
        <div role="status" className="flex flex-col gap-1 rounded-lg border border-warning bg-warning-soft px-4 py-3 text-sm text-warning">
          <p>Este certificado fue reemplazado por el código {certificado.reemplazadoPor}.</p>
          {certificado.reemplazadoPor && (
            <Link to={`/verificar/${encodeURIComponent(certificado.reemplazadoPor)}`} className="font-semibold underline">
              Ver certificado vigente
            </Link>
          )}
        </div>
      )}

      <dl className="flex flex-col gap-3 text-sm wrap-anywhere">
        <Dato termino="Nombre">{certificado.nombre}</Dato>
        <Dato termino="Curso">{certificado.curso}</Dato>
        <Dato termino="Horas">{`${certificado.horasLectivas} horas lectivas`}</Dato>
        <Dato termino="Fecha">{fechaCompleta(certificado.emitidoEn)}</Dato>
        <Dato termino="Tipo">{CERTIFICADOS_CURSO[certificado.tipo]}</Dato>
      </dl>

      {certificado.estado === 'VALIDO' && (
        <Link to={`/certificados/${encodeURIComponent(certificado.codigo)}`} className="text-sm font-semibold text-brand underline">
          Ver el certificado
        </Link>
      )}
    </section>
  )
}

function Dato({ termino, children }: { termino: string; children: ReactNode }) {
  return (
    <div className="flex gap-2">
      <dt className="w-27.5 shrink-0 text-muted">{termino}</dt>
      <dd className="min-w-0 flex-1 font-medium text-ink">{children}</dd>
    </div>
  )
}
