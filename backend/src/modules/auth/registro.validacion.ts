import { z } from 'zod';
import { textoObligatorio } from '../../shared/validacion.js';

export const esquemaRegistro = z.object({
  dni: textoObligatorio('Ingresa tu DNI.').pipe(z.string().regex(/^\d{8}$/, 'El DNI debe tener 8 dígitos.')),
  nombres: textoObligatorio('Ingresa tus nombres.').pipe(z.string().max(80, 'Los nombres deben tener como máximo 80 caracteres.')),
  apellidos: textoObligatorio('Ingresa tus apellidos.').pipe(z.string().max(80, 'Los apellidos deben tener como máximo 80 caracteres.')),
  email: textoObligatorio('Ingresa tu correo electrónico.').pipe(z.email('Ingresa un correo válido.').max(180, 'El correo debe tener como máximo 180 caracteres.')).transform(valor => valor.toLowerCase()),
  celular: textoObligatorio('Ingresa tu celular.').pipe(z.string().regex(/^9\d{8}$/, 'El celular debe tener 9 dígitos y empezar con 9.')),
  password: z.string({ error: 'Ingresa tu contraseña.' }).min(8, 'La contraseña debe tener al menos 8 caracteres.').refine(valor => Buffer.byteLength(valor, 'utf8') <= 72, 'La contraseña debe ocupar como máximo 72 bytes.'),
  aceptaPrivacidad: z.literal(true, 'Debes aceptar el aviso de privacidad para crear tu cuenta.')
}).strict();
export type DatosRegistro = z.infer<typeof esquemaRegistro>;
