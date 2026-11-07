import { z } from 'zod'

const texto = (mensaje: string) => z.string({ error: mensaje }).trim().min(1, mensaje)
export const esquemaRegistro = z.object({
  dni: texto('Ingresa tu DNI.').regex(/^\d{8}$/, 'El DNI debe tener 8 dígitos.'),
  nombres: texto('Ingresa tus nombres.').max(80, 'Los nombres deben tener como máximo 80 caracteres.'),
  apellidos: texto('Ingresa tus apellidos.').max(80, 'Los apellidos deben tener como máximo 80 caracteres.'),
  email: texto('Ingresa tu correo electrónico.').pipe(z.email('Ingresa un correo válido.').max(180, 'El correo debe tener como máximo 180 caracteres.')),
  celular: texto('Ingresa tu celular.').regex(/^9\d{8}$/, 'El celular debe tener 9 dígitos y empezar con 9.'),
  password: z.string({ error: 'Ingresa tu contraseña.' }).min(8, 'La contraseña debe tener al menos 8 caracteres.').refine(valor => new TextEncoder().encode(valor).length <= 72, 'La contraseña debe ocupar como máximo 72 bytes.'),
  aceptaPrivacidad: z.literal(true, 'Debes aceptar el aviso de privacidad para crear tu cuenta.'),
}).strict()
export type FormularioRegistro = z.infer<typeof esquemaRegistro>
