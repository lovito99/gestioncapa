import { SignJWT } from "jose";

export type ConfiguracionJitsi = {
  jitsiDominio: string;
  jitsiAplicacion: string;
  jitsiSecreto: string;
};

export async function emitirCredencialJitsi(configuracion: ConfiguracionJitsi, usuario: {
  identificador: string; nombre: string; correo: string; moderador?: boolean;
}, nombreSala: string, ahora = Math.floor(Date.now() / 1000)) {
  return new SignJWT({
    room: nombreSala,
    context: { user: { id: usuario.identificador, name: usuario.nombre, email: usuario.correo, ...(usuario.moderador === undefined ? {} : { moderator: usuario.moderador }) } }
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuer(configuracion.jitsiAplicacion)
    .setAudience(configuracion.jitsiAplicacion)
    .setSubject(configuracion.jitsiDominio)
    .setIssuedAt(ahora)
    .setNotBefore(ahora - 10)
    .setExpirationTime(ahora + 300)
    .sign(new TextEncoder().encode(configuracion.jitsiSecreto));
}
