import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { z } from 'zod'
import googleG from '@/assets/googleG.png'
import insignia from '@/assets/insignia-cppp.png'
import { useAuth } from '@/auth/useAuth'
import { inicioPorRol } from '@/auth/inicioPorRol'
import { PaginaPublica } from '@/components/layout/Pagina'
import { Boton } from '@/components/ui/Boton'
import { Campo } from '@/components/ui/Campo'
import { Entrada } from '@/components/ui/Entrada'
import { esApiError, mensajeDeError } from '@/lib/api'
import { sesion } from '@/lib/sesion'
import { accesoConCurso,cursoDeBusqueda,destinoTrasAcceso } from '@/lib/retornoCurso'
import { useLogin } from '@/servicios/auth'
import { iniciarGoogle, useGoogleDisponible } from '@/servicios/authGoogle'

const esquema = z.object({
  email: z.string().trim().min(1, 'Ingresa tu correo electrónico').pipe(z.email('Ingresa un correo válido')),
  password: z.string().min(1, 'Ingresa tu contraseña'),
})
type Formulario = z.infer<typeof esquema>

interface Props {
  /** Google autenticó un correo que no tiene cuenta (Figma 1.1a). */
  googleSinCuenta?: { correo: string; crear: () => void }
}

export function LoginPagina({ googleSinCuenta }: Props) {
  const { usuario, iniciar } = useAuth()
  const ubicacion = useLocation()
  const login = useLogin()
  const googleDisponible = useGoogleDisponible()
  const [abriendoGoogle, setAbriendoGoogle] = useState(false)
  const [errorGoogle, setErrorGoogle] = useState('')
  const [verPassword, setVerPassword] = useState(false)
  // Se lee una vez: el aviso desaparece al iniciar una sesión nueva.
  const [sesionExpiro] = useState(() => sesion.expiro())

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Formulario>({ resolver: zodResolver(esquema) })

  const desde = (ubicacion.state as { desde?: string } | null)?.desde
  const curso = cursoDeBusqueda(ubicacion.search)
  if (usuario) return <Navigate to={destinoTrasAcceso(ubicacion.search,desde,inicioPorRol(usuario))} replace />

  const enviar = handleSubmit((datos) =>
    login.mutate(datos, {
      // Una sola redirección, arriba, conserva también el token del enlace QR.
      onSuccess: iniciar,
    }),
  )

  async function entrarConGoogle() {
    setErrorGoogle('')
    setAbriendoGoogle(true)
    try {
      await iniciarGoogle(curso)
    } catch (error) {
      setErrorGoogle(mensajeDeError(error, 'No pudimos abrir Google. Vuelve a intentarlo.'))
      setAbriendoGoogle(false)
    }
  }

  const credencialesMalas = esApiError(login.error, 'CREDENCIALES_INVALIDAS')
  const errorServidor = errorGoogle || (login.error
    ? esApiError(login.error, 'CREDENCIALES_INVALIDAS')
      ? 'El correo o la contraseña no son correctos.'
      : login.error.message
    : sesionExpiro
      ? 'Tu sesión expiró. Vuelve a iniciar sesión.'
      : null)

  return (
    <PaginaPublica encabezado="acceso">
      <main className="flex flex-1 flex-col items-center px-4 py-6 sm:pt-16 sm:pb-20">
        <div className="flex w-full max-w-110 flex-col items-center gap-5 rounded-xl border border-line bg-white p-5 shadow-[0_8px_24px_rgba(48,8,18,0.08)] sm:p-10">
          <img src={insignia} alt="" width={44} height={60} className="h-15 w-11 object-contain" />
          <div className="flex flex-col items-center gap-1.5 text-center">
            <h1 className="text-2xl leading-8 font-bold text-ink">Iniciar sesión</h1>
            <p className="text-sm leading-5 text-muted">Ingresa a GestionCapa del CPPP – Región Cusco</p>
          </div>

          {errorServidor ? (
            <p role="alert" className="w-full rounded-lg bg-danger-soft px-3.5 py-3 text-sm leading-5 text-danger">
              {errorServidor}
            </p>
          ) : googleSinCuenta && (
            <div role="alert" className="flex w-full flex-col items-start gap-1.5 rounded-lg bg-danger-soft px-3.5 py-3">
              <p className="text-sm leading-5 wrap-anywhere text-danger">No encontramos una cuenta del CPPP con {googleSinCuenta.correo}.</p>
              <button type="button" onClick={googleSinCuenta.crear} className="text-left text-base leading-6 font-medium text-brand hover:underline">
                Crear mi cuenta con ese correo →
              </button>
            </div>
          )}

          {googleDisponible && <>
            <Boton type="button" variante="secundario" cargando={abriendoGoogle} disabled={login.isPending} onClick={() => void entrarConGoogle()}
              className="w-full gap-3 text-base font-medium ring-muted">
              <img src={googleG} alt="" width={18} height={18} aria-hidden />
              Continuar con Google
            </Boton>
            <div className="flex w-full items-center gap-3 text-xs leading-4 font-medium text-muted">
              <span className="h-px flex-1 bg-line" aria-hidden />
              o con tu correo
              <span className="h-px flex-1 bg-line" aria-hidden />
            </div>
          </>}

          <form onSubmit={enviar} noValidate className="flex w-full flex-col gap-5">
            <Campo etiqueta="Correo electrónico" error={errors.email?.message}>
              <Entrada type="email" autoComplete="email" placeholder="nombre@correo.com"
                estado={errors.email ? 'error' : 'normal'} {...register('email')} />
            </Campo>

            <div className="relative">
              <Campo etiqueta="Contraseña" error={errors.password?.message}>
                <Entrada type={verPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="Ingresa tu contraseña"
                  estado={errors.password || credencialesMalas ? 'error' : 'normal'} className="pr-11" {...register('password')} />
              </Campo>
              {/* Etiqueta de 26 px: el botón queda centrado sobre la entrada */}
              <button
                type="button"
                onClick={() => setVerPassword((v) => !v)}
                aria-label={verPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                aria-pressed={verPassword}
                className="absolute top-8.5 right-1 flex size-8 items-center justify-center rounded-md text-muted hover:text-brand focus-visible:outline-2 focus-visible:outline-brand sm:top-7.5"
              >
                {verPassword ? <EyeOff className="size-4.5" aria-hidden /> : <Eye className="size-4.5" aria-hidden />}
              </button>
            </div>

            <Boton type="submit" cargando={login.isPending} disabled={abriendoGoogle} className="h-12 w-full text-base font-medium sm:h-10">
              Ingresar
            </Boton>
          </form>

          <p className="text-center text-sm leading-5 text-muted">
            ¿No tienes cuenta?{' '}
            <Link to={accesoConCurso('/registro',curso)} className="text-brand hover:underline">
              Créala aquí
            </Link>
          </p>
        </div>
      </main>
    </PaginaPublica>
  )
}
