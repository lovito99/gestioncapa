/** Identificador numérico positivo de la URL (usuario o certificado). */
export const esIdHistorial = (id: string | undefined): id is string => !!id && /^[1-9]\d{0,14}$/.test(id);
