import { useState } from 'react'
import { guardarDescarga } from '@/servicios/historial'
import { Download, Printer } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { Link, useParams } from 'react-router-dom'
import insignia from '@/assets/insignia-cppp.png'
import { PaginaPublica } from '@/components/layout/Pagina'
import { Alerta } from '@/components/ui/Alerta'
import { Boton } from '@/components/ui/Boton'
import { Cargando } from '@/components/ui/Estados'
import { esApiError, mensajeDeError } from '@/lib/api'
import { CPPP } from '@/lib/cppp'
import { rangoFechas } from '@/lib/formato'
import { descargarCertificado, normalizarCodigo, useDocumentoCertificado, type CertificadoDocumento } from '@/servicios/certificados'
import { MODALIDADES_CURSO } from '@/servicios/cursos'

/** 5.1 · Constancia o certificado listo para imprimir o guardar como PDF desde el navegador. */
export function CertificadoPagina() {
  const { codigo = '' } = useParams()
  const certificado = useDocumentoCertificado(normalizarCodigo(codigo))
  const [descargando, cambiarDescargando] = useState(false)
  const [errorDescarga, cambiarErrorDescarga] = useState('')
  const descargar = async () => {
    cambiarDescargando(true); cambiarErrorDescarga('')
    try { guardarDescarga(await descargarCertificado(codigo), `constancia-${codigo}.pdf`) }
    catch (error) { cambiarErrorDescarga(mensajeDeError(error, 'No pudimos descargar el PDF.')) }
    finally { cambiarDescargando(false) }
  }

  return (
    <PaginaPublica className="print:bg-white">
      <div className="mx-auto flex w-full max-w-268 flex-col gap-4 px-4 pt-6 pb-10 print:max-w-none print:p-0">
        {certificado.isPending ? (
          <Cargando texto="Cargando el certificado…" />
        ) : certificado.isError ? (
          <Alerta tipo="error">
            {esApiError(certificado.error, 'CERTIFICADO_NO_EXISTE')
              ? 'No encontramos un certificado con ese código.'
              : mensajeDeError(certificado.error, 'No pudimos cargar el certificado.')}
          </Alerta>
        ) : certificado.data.estado !== 'VALIDO' ? (
          // Un certificado anulado o reemplazado no se vuelve a mostrar como documento
          <Alerta tipo="advertencia" titulo="Este certificado ya no está vigente">
            <Link to={`/verificar/${encodeURIComponent(certificado.data.codigo)}`} className="font-semibold underline">
              Ver el detalle en la verificación
            </Link>
          </Alerta>
        ) : (
          <>
            {certificado.data.demo && <Alerta tipo="advertencia">Documento de demostración. Sin validez oficial; firmas genéricas.</Alerta>}
            {errorDescarga && <Alerta tipo="error">{errorDescarga}</Alerta>}
            <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
              <p className="text-sm text-muted">Usa «Imprimir» y elige «Guardar como PDF» para descargarlo.</p>
              <Boton cargando={descargando} onClick={() => void descargar()}><Download className="size-4" aria-hidden />Descargar PDF</Boton>
              <Boton onClick={() => window.print()}>
                <Printer className="size-4" aria-hidden />
                Imprimir
              </Boton>
            </div>
            {/* El documento mide como una hoja A4 horizontal; en celular se desplaza de lado */}
            <div className="overflow-x-auto print:overflow-visible">
              <Constancia certificado={certificado.data} />
            </div>
          </>
        )}
      </div>
    </PaginaPublica>
  )
}

function Constancia({ certificado }: { certificado: CertificadoDocumento }) {
  const aprobacion = certificado.tipo === 'APROBACION'
  const urlVerificacion = `${window.location.origin}/verificar/${encodeURIComponent(certificado.codigo)}`
  const modalidad = MODALIDADES_CURSO[certificado.modalidad].toLowerCase()

  return (
    <article className="flex aspect-[297/210] w-256 flex-col bg-page p-6 print:w-full print:break-inside-avoid">
      <div className="flex flex-1 flex-col items-center gap-3.5 border-3 border-gold px-16 py-9 text-center">
        <img src={insignia} alt="" width={70} height={96} className="h-24 w-[70px] object-contain" />
        <p className="text-base font-semibold tracking-[1.28px] text-ink uppercase">{CPPP.nombre}</p>
        <p className="text-[13px] font-medium tracking-[1.56px] text-brand uppercase">{CPPP.region}</p>
        <h1 className="text-4xl font-bold text-brand uppercase">
          {aprobacion ? 'Certificado de aprobación' : 'Constancia de participación'}
        </h1>
        <p className="text-base text-muted">Se otorga la presente a:</p>
        <p className="font-serif text-3xl font-bold text-ink">{certificado.nombre}</p>
        {certificado.dniEnmascarado && <p className="text-sm font-medium text-muted">DNI {certificado.dniEnmascarado}</p>}
        <p className="max-w-190 text-base leading-6 text-ink">
          Por haber {aprobacion ? 'aprobado' : 'participado en'} el curso «{certificado.curso}», en la modalidad {modalidad}, con
          una duración de {certificado.horasLectivas} horas lectivas, realizado {certificado.fechaInicio && certificado.fechaFin ? rangoFechas(certificado.fechaInicio, certificado.fechaFin) : 'en fechas no registradas'}.
        </p>

        <div className="mt-auto flex w-full items-end justify-between">
          <Firma nombre={certificado.demo ? 'Firma demo del Decano' : CPPP.decano.nombre} cargo={CPPP.decano.cargo} />
          <Firma nombre={certificado.instructorNombre} cargo={certificado.demo ? 'Firma demo del instructor' : 'Instructor'} />
          <div className="flex flex-col items-center gap-1.5">
            <a href={urlVerificacion} aria-label={`Verificar el certificado ${certificado.codigo}`}>
              <QRCodeSVG value={urlVerificacion} size={104} marginSize={0} title="Código QR para verificar el certificado" />
            </a>
            <p className="text-xs font-semibold text-ink">Código: {certificado.codigo}</p>
          </div>
        </div>
      </div>
    </article>
  )
}

function Firma({ nombre, cargo }: { nombre: string; cargo: string }) {
  return (
    <div className="flex w-60 flex-col items-center gap-1 pt-14">
      <span aria-hidden className="h-px w-55 bg-ink" />
      <p className="text-sm font-semibold text-ink">{nombre}</p>
      <p className="text-[13px] text-muted">{cargo}</p>
    </div>
  )
}
