import { zodResolver } from '@hookform/resolvers/zod'
import { CircleAlert, Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Navigate, useLocation } from 'react-router-dom'
import { z } from 'zod'
import ilustracion from '@/assets/ilustracion-login.png'
import logoBlanco from '@/assets/logo-qr-blanco.svg'
import logoMovil from '@/assets/logo-qr-mobile.svg'
import { useAuth } from '@/auth/useAuth'
import { inicioPorRol } from '@/auth/inicioPorRol'
import { Boton } from '@/components/ui/Boton'
import { esApiError } from '@/lib/api'
import { cn } from '@/lib/cn'
import { sesion } from '@/lib/sesion'
import { useLogin } from '@/servicios/auth'

const esquema = z.object({
  email: z.string().trim().min(1, 'Ingresa tu correo electrónico').pipe(z.email('Ingresa un correo válido')),
  password: z.string().min(1, 'Ingresa tu contraseña'),
})
type Formulario = z.infer<typeof esquema>

const claseEntrada =
  'h-12 w-full rounded-lg border border-line bg-white px-3.75 text-base text-ink placeholder:text-placeholder outline-none focus-visible:ring-2 focus-visible:ring-brand-light lg:h-10 lg:border-placeholder lg:text-[15px]'

export function LoginPagina() {
  const { usuario, iniciar } = useAuth()
  const ubicacion = useLocation()
  const login = useLogin()
  const [verPassword, setVerPassword] = useState(false)
  // Se lee una vez: el aviso desaparece al iniciar una sesión nueva.
  const [sesionExpiro] = useState(() => sesion.expiro())

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Formulario>({ resolver: zodResolver(esquema) })

  const desde = (ubicacion.state as { desde?: string } | null)?.desde
  if (usuario) return <Navigate to={desde ?? inicioPorRol(usuario)} replace />

  const enviar = handleSubmit((datos) =>
    login.mutate(datos, {
      // Una sola redirección, arriba, conserva también el token del enlace QR.
      onSuccess: iniciar,
    }),
  )

  const errorServidor = login.error
    ? esApiError(login.error, 'CREDENCIALES_INVALIDAS')
      ? 'Correo o contraseña incorrectos. Verifica tus datos e intenta de nuevo.'
      : login.error.message
    : sesionExpiro
      ? 'Tu sesión expiró. Vuelve a iniciar sesión.'
      : null

  return (
    <div className="flex min-h-dvh flex-col bg-white lg:flex-row">
      {/* Panel azul: completo en escritorio, franja de 160 px en móvil */}
      <aside className="relative flex h-40 shrink-0 items-center justify-center overflow-hidden bg-brand-dark px-4 lg:h-auto lg:flex-1 lg:flex-col lg:items-start lg:justify-between lg:p-16">
        <span aria-hidden className="absolute -top-20 -left-20 hidden size-80 rounded-full bg-brand opacity-10 lg:block" />
        <span aria-hidden className="absolute -right-20 -bottom-20 hidden size-96 rounded-full bg-brand-light opacity-10 lg:block" />

        <div className="relative flex items-center gap-2.5 lg:gap-3">
          <span className="flex size-8 items-center justify-center rounded-md bg-brand-light p-1.5 lg:size-10 lg:rounded-lg lg:shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)]">
            <img src={logoMovil} alt="" className="size-5 lg:hidden" />
            <img src={logoBlanco} alt="" width={24} height={24} className="hidden lg:block" />
          </span>
          <span className="text-xl leading-7 font-bold tracking-[-0.5px] text-white lg:text-2xl lg:leading-8 lg:tracking-[-0.6px]">
            GestionCapa
          </span>
        </div>

        <div className="relative hidden w-full flex-1 items-center justify-center py-8 lg:flex">
          <img
            src={ilustracion}
            alt="Ilustración de una capacitación presencial con registro de asistencia por QR"
            className="aspect-643/578 w-full max-w-150 object-contain [image-rendering:auto]"
          />
        </div>

        <div className="relative hidden max-w-lg lg:block">
          <h1 className="text-[32px] leading-10 font-bold tracking-[-0.8px] text-white">Bienvenido</h1>
          <p className="mt-2 text-base leading-6.5 text-white/90">
            Gestiona tus capacitaciones y registra asistencia con QR
          </p>
        </div>
      </aside>

      {/* Formulario */}
      <main className="flex flex-1 justify-center px-4 pt-8 pb-6 lg:items-center lg:p-16">
        <div className="w-full max-w-100">
          <h2 className="text-2xl leading-7.5 font-bold tracking-[-0.6px] text-ink lg:text-[32px] lg:leading-10 lg:tracking-[-0.8px]">
            Iniciar sesión
          </h2>
          <p className="mt-1.5 text-sm leading-[22.75px] text-placeholder lg:mt-2 lg:text-base lg:leading-6 lg:text-muted">
            Ingresa con el correo y contraseña de tu cuenta
          </p>

          <form onSubmit={enviar} noValidate className="mt-6 flex flex-col gap-4 lg:mt-8">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm leading-5.25 font-medium text-ink">
                Correo electrónico
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="nombre@organizacion.pe"
                aria-invalid={errors.email ? true : undefined}
                aria-describedby={errors.email ? 'email-error' : undefined}
                className={cn(claseEntrada, errors.email && 'border-danger lg:border-danger')}
                {...register('email')}
              />
              {errors.email && (
                <p id="email-error" className="mt-1.5 text-xs text-danger">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div className="pb-2">
              <label htmlFor="password" className="mb-1.5 block text-sm leading-5.25 font-medium text-ink">
                Contraseña
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={verPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  aria-invalid={errors.password ? true : undefined}
                  aria-describedby={errors.password ? 'password-error' : undefined}
                  className={cn(claseEntrada, 'pr-12', errors.password && 'border-danger lg:border-danger')}
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setVerPassword((v) => !v)}
                  aria-label={verPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  aria-pressed={verPassword}
                  className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-lg text-placeholder hover:text-ink"
                >
                  {verPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                </button>
              </div>
              {errors.password && (
                <p id="password-error" className="mt-1.5 text-xs text-danger">
                  {errors.password.message}
                </p>
              )}
            </div>

            {errorServidor && (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-lg border border-danger bg-danger-soft p-3.25 text-sm leading-[17.5px] font-medium text-danger"
              >
                <CircleAlert className="mt-0.5 size-5 shrink-0" aria-hidden />
                <span>{errorServidor}</span>
              </div>
            )}

            <Boton
              type="submit"
              cargando={login.isPending}
              className="mt-2 h-12 w-full text-base font-medium lg:mt-0 lg:h-10"
            >
              Ingresar
            </Boton>
          </form>
        </div>
      </main>
    </div>
  )
}
