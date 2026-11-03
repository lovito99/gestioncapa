import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff } from 'lucide-react'
import { useState, type InputHTMLAttributes, type Ref } from 'react'
import { useForm } from 'react-hook-form'
import { Link, Navigate } from 'react-router-dom'
import { z } from 'zod'
import { useAuth } from '@/auth/useAuth'
import { PaginaPublica } from '@/components/layout/Pagina'
import { Alerta } from '@/components/ui/Alerta'
import { Boton } from '@/components/ui/Boton'
import { Campo } from '@/components/ui/Campo'
import { EnlaceVolver } from '@/components/ui/EnlaceVolver'
import { Entrada } from '@/components/ui/Entrada'
import { esApiError } from '@/lib/api'
import { CPPP } from '@/lib/cppp'
import { useRegistro } from '@/servicios/auth'

const soloDigitos = (cantidad: number, mensaje: string) =>
  z.string().trim().regex(new RegExp(`^\\d{${cantidad}}$`), mensaje)

const esquema = z.object({
  dni: soloDigitos(8, 'El DNI debe tener 8 dígitos.'),
  nombres: z.string().trim().min(1, 'Ingresa tus nombres.').max(80),
  apellidos: z.string().trim().min(1, 'Ingresa tus apellidos.').max(80),
  email: z.string().trim().min(1, 'Ingresa tu correo electrónico.').pipe(z.email('Ingresa un correo válido.')),
  celular: soloDigitos(9, 'El celular debe tener 9 dígitos.').refine((v) => v.startsWith('9'), 'El celular debe empezar con 9.'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres.').max(72),
  aceptaPrivacidad: z.literal(true, 'Debes aceptar el aviso de privacidad para crear tu cuenta.'),
})
type Formulario = z.infer<typeof esquema>

/** Entrada con botón para mostrar u ocultar la contraseña; recibe id y aria-* desde Campo. */
function EntradaContrasena({
  estado,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { estado: 'normal' | 'error'; ref?: Ref<HTMLInputElement> }) {
  const [ver, setVer] = useState(false)
  return (
    <div className="relative">
      <Entrada {...props} estado={estado} type={ver ? 'text' : 'password'} className="pr-11" />
      <button
        type="button"
        onClick={() => setVer((v) => !v)}
        aria-label={ver ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        aria-pressed={ver}
        className="absolute top-1/2 right-1.5 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-brand-light"
      >
        {ver ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
      </button>
    </div>
  )
}

export function RegistroPagina() {
  const { usuario, iniciar } = useAuth()
  const registro = useRegistro()
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitted },
  } = useForm<Formulario>({ resolver: zodResolver(esquema) })

  if (usuario) return <Navigate to="/catalogo" replace />

  const enviar = handleSubmit((datos) =>
    registro.mutate(datos, {
      onSuccess: iniciar,
      onError: (error) => {
        if (!esApiError(error)) return
        for (const [campo, mensaje] of Object.entries(error.fields)) {
          if (campo in esquema.shape) setError(campo as keyof Formulario, { message: mensaje })
        }
      },
    }),
  )

  const yaRegistrado = esApiError(registro.error, 'CUENTA_YA_REGISTRADA')
  const hayErroresDeCampo = isSubmitted && Object.keys(errors).length > 0
  const errorGeneral =
    registro.error && !yaRegistrado && !esApiError(registro.error, 'VALIDACION') ? registro.error.message : null
  const estado = (campo: keyof Formulario) => (errors[campo] ? 'error' : 'normal')

  return (
    <PaginaPublica>
      <div className="mx-auto w-full max-w-140 px-4 py-8 sm:py-10">
        <EnlaceVolver to="/login">Volver a iniciar sesión</EnlaceVolver>
        <h1 className="mt-4 text-2xl leading-8 font-bold text-ink">Crear cuenta</h1>
        <p className="mt-1 text-sm text-muted">Regístrate con tu DNI para inscribirte en los cursos del CPPP.</p>

        <form
          onSubmit={enviar}
          noValidate
          className="mt-5 flex flex-col gap-4 rounded-xl border border-line bg-white p-4 sm:p-5"
        >
          {yaRegistrado ? (
            <Alerta tipo="advertencia" titulo="Ya tienes una cuenta">
              El DNI o el correo que ingresaste ya está registrado.{' '}
              <Link to="/login" className="block font-semibold underline underline-offset-2">
                Recuperar mi contraseña
              </Link>
            </Alerta>
          ) : hayErroresDeCampo ? (
            <Alerta tipo="error">Revisa los campos marcados para crear tu cuenta.</Alerta>
          ) : errorGeneral ? (
            <Alerta tipo="error">{errorGeneral}</Alerta>
          ) : null}

          <Campo etiqueta="DNI" obligatorio error={errors.dni?.message}>
            {/* HU-50: DNI y celular abren el teclado numérico en el celular */}
            <Entrada
              inputMode="numeric"
              autoComplete="off"
              maxLength={8}
              placeholder="8 dígitos"
              estado={estado('dni')}
              {...register('dni')}
            />
          </Campo>

          <div className="grid gap-4 sm:grid-cols-2">
            <Campo etiqueta="Nombres" obligatorio error={errors.nombres?.message}>
              <Entrada autoComplete="given-name" placeholder="Tus nombres" estado={estado('nombres')} {...register('nombres')} />
            </Campo>
            <Campo etiqueta="Apellidos" obligatorio error={errors.apellidos?.message}>
              <Entrada autoComplete="family-name" placeholder="Tus apellidos" estado={estado('apellidos')} {...register('apellidos')} />
            </Campo>
          </div>

          <Campo etiqueta="Correo electrónico" obligatorio error={errors.email?.message}>
            <Entrada type="email" autoComplete="email" placeholder="nombre@correo.com" estado={estado('email')} {...register('email')} />
          </Campo>

          <Campo etiqueta="Celular" obligatorio error={errors.celular?.message}>
            <Entrada
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              maxLength={9}
              placeholder="9 dígitos"
              estado={estado('celular')}
              {...register('celular')}
            />
          </Campo>

          <Campo etiqueta="Contraseña" obligatorio error={errors.password?.message} ayuda="Mínimo 8 caracteres.">
            <EntradaContrasena
              autoComplete="new-password"
              placeholder="Mínimo 8 caracteres"
              estado={estado('password')}
              {...register('password')}
            />
          </Campo>

          <div>
            <label className="flex items-start gap-2.5 text-sm text-ink">
              <input
                type="checkbox"
                className="mt-0.5 size-4 shrink-0 accent-brand"
                aria-invalid={errors.aceptaPrivacidad ? true : undefined}
                aria-describedby={errors.aceptaPrivacidad ? 'privacidad-error' : undefined}
                {...register('aceptaPrivacidad')}
              />
              <span>
                He leído y acepto el{' '}
                {CPPP.avisoPrivacidad ? (
                  <a href={CPPP.avisoPrivacidad} target="_blank" rel="noreferrer" className="font-semibold text-brand underline underline-offset-2">
                    aviso de privacidad
                  </a>
                ) : (
                  <strong className="font-semibold">aviso de privacidad</strong>
                )}{' '}
                (Ley N.° 29733).
              </span>
            </label>
            {errors.aceptaPrivacidad && (
              <p id="privacidad-error" className="mt-1.5 text-xs text-danger">
                {errors.aceptaPrivacidad.message}
              </p>
            )}
          </div>

          <Boton type="submit" cargando={registro.isPending} className="h-12 w-full sm:h-10">
            Crear cuenta
          </Boton>
        </form>
      </div>
    </PaginaPublica>
  )
}
