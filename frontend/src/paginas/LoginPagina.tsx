import { zodResolver } from '@hookform/resolvers/zod'
import { CircleAlert, Eye, EyeOff, LockKeyhole, Mail } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { Navigate, useLocation } from 'react-router-dom'
import { z } from 'zod'
import insignia from '@/assets/insignia-cppp.png'
import lineaEscritorio from '@/assets/login-linea.svg'
import lineaMovil from '@/assets/login-linea-movil.svg'
import panelEscritorio from '@/assets/login-panel.svg'
import panelMovil from '@/assets/login-panel-movil.svg'
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
  'h-6 min-w-0 flex-1 bg-transparent text-[15px] text-white placeholder:text-white/60 outline-none'

/** Campo subrayado del diseño: etiqueta dorada, icono, entrada y línea inferior. */
function CampoLinea({
  id,
  etiqueta,
  icono,
  error,
  children,
}: {
  id: string
  etiqueta: string
  icono: ReactNode
  error?: string
  children: ReactNode
}) {
  return (
    <div className="flex w-full flex-col gap-2.5">
      <label htmlFor={id} className="text-[13px] font-medium text-gold-light">
        {etiqueta}
      </label>
      <div
        className={cn(
          'flex items-center gap-2.5 border-b-[1.5px] border-white pb-2.5 transition-colors focus-within:border-gold',
          error && 'border-danger-on-dark focus-within:border-danger-on-dark',
        )}
      >
        {icono}
        {children}
      </div>
      {error && (
        <p id={`${id}-error`} className="text-xs text-danger-on-dark">
          {error}
        </p>
      )}
    </div>
  )
}

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
    <div className="min-h-dvh bg-brand-night lg:flex lg:items-center lg:justify-center lg:p-8">
      {/* Tarjeta 960 × 560 con borde dorado en escritorio; pantalla completa en móvil */}
      <div className="relative lg:h-140 lg:w-240 lg:shrink-0 lg:overflow-hidden lg:border-[1.5px] lg:border-gold lg:shadow-[0_0_44px_rgba(209,171,74,0.35)]">
        <img src={panelEscritorio} alt="" aria-hidden className="absolute -top-[1.5px] -left-[1.5px] hidden h-140 w-150 max-w-none lg:block" />
        <img src={lineaEscritorio} alt="" aria-hidden className="absolute -top-[1.5px] left-[328.5px] hidden h-140 w-[270px] max-w-none lg:block" />
        <img src={panelMovil} alt="" aria-hidden className="absolute inset-x-0 top-0 h-75 w-full lg:hidden" />
        <img src={lineaMovil} alt="" aria-hidden className="absolute inset-x-0 top-[230px] h-[70px] w-full lg:hidden" />

        {/* Marca en móvil: insignia y nombre sobre el panel vino */}
        <div className="relative flex h-75 flex-col items-center gap-2.5 pt-9 lg:hidden">
          <img src={insignia} alt="" width={84} height={115} className="h-28.75 w-21 object-contain" />
          <span className="font-serif text-[26px] font-bold text-white">GestionCapa</span>
        </div>

        {/* Marca y bienvenida en escritorio */}
        <span className="absolute top-[38.5px] left-[46.5px] hidden font-serif text-xl font-bold text-white lg:block">
          GestionCapa
        </span>
        <div className="absolute top-[123.5px] left-[46.5px] hidden w-75 flex-col items-start gap-4.5 lg:flex">
          <img src={insignia} alt="" width={130} height={177} className="h-44.25 w-32.5 object-contain" />
          <p className="font-serif text-[44px] font-bold text-white">Bienvenido</p>
          <span aria-hidden className="h-0.75 w-14 rounded-xs bg-gold" />
          <p className="w-65 text-base leading-6 text-white">Gestiona tus capacitaciones y registra asistencia con QR</p>
        </div>

        {/* Formulario */}
        {/* Centrado vertical en escritorio: sin error queda a 124 px del borde, como en el Figma */}
        <main className="relative px-7 pt-10 pb-10 lg:absolute lg:inset-y-0 lg:left-[598.5px] lg:flex lg:w-80 lg:items-center lg:p-0">
          <div className="mx-auto flex w-full max-w-100 flex-col gap-7">
            <div className="flex flex-col items-center gap-2 text-center text-white">
              <h1 className="text-[28px] font-bold lg:text-[32px]">Iniciar sesión</h1>
              <p className="text-sm">Ingresa con el correo y contraseña de tu cuenta</p>
            </div>

            <form onSubmit={enviar} noValidate className="flex flex-col gap-7">
              <CampoLinea
                id="email"
                etiqueta="Correo electrónico"
                error={errors.email?.message}
                icono={<Mail className="size-4.5 shrink-0 text-gold-light" aria-hidden />}
              >
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="nombre@organizacion.pe"
                  aria-invalid={errors.email ? true : undefined}
                  aria-describedby={errors.email ? 'email-error' : undefined}
                  className={claseEntrada}
                  {...register('email')}
                />
              </CampoLinea>

              <CampoLinea
                id="password"
                etiqueta="Contraseña"
                error={errors.password?.message}
                icono={<LockKeyhole className="size-4.5 shrink-0 text-gold-light" aria-hidden />}
              >
                <input
                  id="password"
                  type={verPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Ingresa tu contraseña"
                  aria-invalid={errors.password ? true : undefined}
                  aria-describedby={errors.password ? 'password-error' : undefined}
                  className={claseEntrada}
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setVerPassword((v) => !v)}
                  aria-label={verPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  aria-pressed={verPassword}
                  className="-my-2 -mr-2 flex size-8 shrink-0 items-center justify-center rounded-md text-white hover:text-gold-light focus-visible:outline-2 focus-visible:outline-gold"
                >
                  {verPassword ? <EyeOff className="size-4.5" /> : <Eye className="size-4.5" />}
                </button>
              </CampoLinea>

              {errorServidor && (
                <div
                  role="alert"
                  className="flex items-start gap-2.5 rounded-[10px] border border-danger bg-danger-soft px-3.5 py-3 text-[13px] leading-4.5 font-medium text-danger"
                >
                  <CircleAlert className="size-4.5 shrink-0" aria-hidden />
                  <span>{errorServidor}</span>
                </div>
              )}

              <Boton
                type="submit"
                cargando={login.isPending}
                className="h-12 w-full rounded-3xl bg-gold text-base text-brand-night hover:bg-gold-light focus-visible:outline-gold disabled:bg-gold/60"
              >
                Ingresar
              </Boton>
            </form>
          </div>
        </main>
      </div>
    </div>
  )
}
