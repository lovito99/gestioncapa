// Funciones puras de preparar.mjs (HU-26). No leen ni escriben archivos: se prueban aisladas.

/** Variables de docker-jitsi-meet que exige la sala segura. Las listas se combinan con las existentes. */
export const modulosSalaSegura = {
  XMPP_MODULES: ['presence_identity', 'persistent_lobby'],
  XMPP_MUC_MODULES: ['token_affiliation', 'token_lobby_ondemand'],
};
export const valoresSalaSegura = {
  ENABLE_AUTH: '1', AUTH_TYPE: 'jwt', ENABLE_GUESTS: '0', JWT_ALLOW_EMPTY: '0',
  ENABLE_AV_MODERATION: '1', ENABLE_MODERATOR_CHECKS: '1', JICOFO_ENABLE_AUTH: '0', ENABLE_AUTO_OWNER: '0',
  // Sala de espera obligatoria para colegiados; sin grabación ni transmisión en el servidor.
  ENABLE_LOBBY: '1', ENABLE_RECORDING: '0', ENABLE_LIVESTREAMING: '0', DISABLE_LOCAL_RECORDING: '1',
};

/** Une listas separadas por comas sin duplicar ni perder módulos ya configurados. */
export function combinarModulos(actual, requeridos) {
  const existentes = (actual ?? '').split(',').map(modulo => modulo.trim()).filter(Boolean);
  return [...new Set([...existentes, ...requeridos])].join(',');
}

function leerValor(texto, nombre) {
  return texto.match(new RegExp(`^${nombre}=(.*)$`, 'm'))?.[1];
}

/** Escribe o reemplaza `NOMBRE=valor` conservando el resto del archivo .env. */
export function fijarValores(texto, valores) {
  let resultado = texto;
  for (const [nombre, valor] of Object.entries(valores)) {
    const patron = new RegExp(`^#?${nombre}=.*$`, 'm');
    resultado = patron.test(resultado) ? resultado.replace(patron, `${nombre}=${valor}`) : `${resultado.replace(/\n?$/, '\n')}${nombre}=${valor}\n`;
  }
  return resultado;
}

/** Aplica la sala segura a un .env de docker-jitsi-meet, combinando los módulos existentes. */
export function entornoSalaSegura(texto) {
  const modulos = Object.fromEntries(Object.entries(modulosSalaSegura).map(([nombre, requeridos]) => [nombre, combinarModulos(leerValor(texto, nombre), requeridos)]));
  return fijarValores(texto, { ...valoresSalaSegura, ...modulos });
}

/** Componente event_sync (jitsi-contrib, Apache-2.0) que informa entradas y salidas al backend. */
export function componenteEventos({ dominio, apiPrefijo, secreto }) {
  for (const [nombre, valor] of Object.entries({ dominio, apiPrefijo, secreto })) {
    if (typeof valor !== 'string' || !valor || /["\\\n]/.test(valor)) throw new Error(`Valor inválido para ${nombre}.`);
  }
  if (!/^https?:\/\/[^/]+\/api\/jitsi$/.test(apiPrefijo)) throw new Error('apiPrefijo debe terminar en /api/jitsi.');
  return `-- Generado por infraestructura/jitsi/preparar.mjs (HU-26). No contiene datos de usuarios.
Component "eventos.${dominio}" "event_sync_component"
    muc_component = "conference.${dominio}"
    breakout_component = "breakout.${dominio}"
    api_prefix = "${apiPrefijo}"
    api_headers = { ["Authorization"] = "Bearer ${secreto}" }
    api_timeout = 10
    api_retry_count = 5
    api_retry_delay = 2
`;
}
