/** Datos institucionales del CPPP Región Cusco que muestran el encabezado y el pie (HU-49). */
export const CPPP = {
  nombre: 'Colegio Profesional de Profesores del Perú',
  region: 'Región Cusco',
  web: { texto: 'www.cpppregion-cusco.com', url: 'https://www.cpppregion-cusco.com/' },
  direcciones: [
    'Av. La Cultura 1112, Of. 704, Edificio La Torre de San Antonio, Cusco.',
    'Av. La Cultura 1114, Of. 106, Edificio Oferplaza.',
    'Calle Suárez N.° 350, San Jerónimo – Cusco.',
  ],
  telefonos: ['984663946', '987046527'],
  /** `porConfirmar`: el dato se muestra, pero el CPPP aún debe validarlo (así lo marca el Figma) */
  correo: { valor: 'cppprc@gmail.com', porConfirmar: true },
  /** null = el CPPP aún no lo confirma; se muestra como pendiente */
  horario: null as string | null,
  redes: [{ nombre: 'Facebook', url: 'https://www.facebook.com/colegioprofesorescusco/', porConfirmar: true }],
  whatsapp: '984663946',
  /** Firma institucional de los certificados (5.1); nombre tomado del Figma, pendiente de confirmar */
  decano: { nombre: 'Dr. Juan Huillca Ochoa', cargo: 'Decano Regional' },
  /** Página del aviso de privacidad (Ley N.° 29733); pendiente de que el CPPP la publique */
  avisoPrivacidad: null as string | null,
}
