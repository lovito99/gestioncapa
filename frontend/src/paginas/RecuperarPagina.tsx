import { PaginaPublica } from '@/components/layout/Pagina'
import { EnlaceVolver } from '@/components/ui/EnlaceVolver'
import { CPPP } from '@/lib/cppp'

/** HU-50 ofrece recuperación asistida; el envío automático por correo pertenece a RF-02. */
export function RecuperarPagina() {
  const mensaje = encodeURIComponent('Necesito ayuda para recuperar el acceso a mi cuenta de capacitaciones del CPPP.')
  return <PaginaPublica><main className="mx-auto w-full max-w-140 space-y-4 px-4 py-8 wrap-anywhere">
    <EnlaceVolver to="/login">Volver a iniciar sesión</EnlaceVolver>
    <h1 className="text-2xl font-bold">Recuperar mi contraseña</h1>
    <p>Si ya tienes una cuenta, solicita ayuda al CPPP por su canal institucional para recuperar el acceso.</p>
    <p>La recuperación por correo todavía no está disponible en esta plataforma.</p>
    <a className="inline-block rounded-lg bg-brand px-4 py-3 font-semibold text-white" href={`https://wa.me/51${CPPP.whatsapp}?text=${mensaje}`} target="_blank" rel="noreferrer">Solicitar ayuda al CPPP</a>
  </main></PaginaPublica>
}
