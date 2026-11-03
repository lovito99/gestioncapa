import type { ReactNode } from 'react'
import { CPPP } from '@/lib/cppp'
import { LogoInsignia } from './Logo'

/** Enlace externo, o el texto subrayado del diseño mientras el CPPP no confirme la dirección. */
function EnlaceExterno({ url, children }: { url: string | null; children: ReactNode }) {
  if (!url) return <span className="underline">{children}</span>
  return (
    <a href={url} target="_blank" rel="noreferrer" className="underline hover:text-gold-light">
      {children}
    </a>
  )
}

function Columna({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2.5">
      <h2 className="text-xs leading-4 font-medium tracking-[0.96px] text-gold-light uppercase">{titulo}</h2>
      {children}
    </div>
  )
}

// El Figma marca así los datos que el CPPP aún debe validar
const porConfirmar = (
  <>
    {' '}(<span className="text-gold-light">Pendiente de confirmar con el CPPP</span>)
  </>
)

/** Pie de página institucional del CPPP (HU-49), común a todas las pantallas. */
export function PiePagina() {
  return (
    <footer className="bg-brand-night px-4 text-sm leading-5 text-brand-soft sm:px-10 print:hidden">
      <div className="mx-auto flex max-w-300 flex-col gap-6 pt-8 pb-6 sm:gap-8 sm:px-6 sm:pt-12">
        <div className="grid gap-6 sm:grid-cols-2 sm:gap-8 lg:grid-cols-[240px_300px_300px_240px] lg:gap-10">
          <div className="flex flex-col gap-3">
            <LogoInsignia alto={56} />
            <p className="font-serif text-base font-bold text-white">
              {CPPP.nombre} – {CPPP.region}
            </p>
          </div>

          <Columna titulo="Dirección">
            {CPPP.direcciones.map((direccion) => (
              <p key={direccion}>{direccion}</p>
            ))}
          </Columna>

          <Columna titulo="Contacto">
            <p>Teléfonos: {CPPP.telefonos.join(' · ')}</p>
            <p>
              Correo:{' '}
              <a href={`mailto:${CPPP.correo.valor}`} className="hover:text-gold-light hover:underline">
                {CPPP.correo.valor}
              </a>
              {CPPP.correo.porConfirmar && porConfirmar}
            </p>
            <p>
              Horario de atención:{' '}
              {CPPP.horario ?? <span className="text-gold-light">Pendiente de confirmar con el CPPP</span>}
            </p>
          </Columna>

          <Columna titulo="Redes sociales">
            {CPPP.redes.map((red) => (
              <p key={red.nombre}>
                <EnlaceExterno url={red.url}>{red.nombre}</EnlaceExterno>
                {red.porConfirmar && porConfirmar}
              </p>
            ))}
            <p>
              WhatsApp:{' '}
              <EnlaceExterno url={`https://wa.me/51${CPPP.whatsapp}`}>{CPPP.whatsapp}</EnlaceExterno>
            </p>
          </Columna>
        </div>

        <div className="flex flex-col gap-2 border-t border-brand-dark pt-4 text-white sm:flex-row sm:justify-between">
          <a href={CPPP.web.url} target="_blank" rel="noreferrer" className="underline hover:text-gold-light">
            Web del CPPP: {CPPP.web.texto} ↗
          </a>
          <EnlaceExterno url={CPPP.avisoPrivacidad}>Aviso de privacidad (Ley N.° 29733)</EnlaceExterno>
        </div>
      </div>
    </footer>
  )
}
