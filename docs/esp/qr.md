# Especificación: HU-07 mostrar QR temporal rotatorio

## Historia

Como instructor de una clase, quiero mostrar en pantalla un código QR firmado que
se renueva cada 30 segundos, para que los participantes registren su presencia
durante la sesión correcta.

## Alcance y decisiones

- **`GET /api/clases/:id/qr`** responde
  `{ token, expiraEn, servidorAhora, duracionSegundos: 30 }` (contrato de
  [API](../API.md)). La pantalla ya existe y funciona con MSW; ahora funciona con el
  backend real.
- **Token** `<claseId>.<expiraEnSegundos>.<firma>`: la firma es HMAC-SHA256 con
  `QR_SECRET` sobre la clase y el vencimiento. Está ligado a una clase, no contiene
  datos personales y no se puede alterar sin invalidar la firma. Es el mismo
  formato que la simulación MSW.
- **Ventanas de 30 s.** El tiempo se divide en ventanas fijas de 30 s
  (`[k·30 s, (k+1)·30 s)`). Durante una ventana, el token de una clase es siempre el
  mismo (varias pantallas muestran el mismo QR) y vence al final de la ventana. En
  la siguiente ventana se emite uno nuevo y **el anterior deja de ser válido**: no
  hay periodo de gracia.
- **Verificación.** `verificarTokenQr(token, ahora)` devuelve la clase del token o
  el motivo del rechazo (`INVALIDO` o `EXPIRADO`). Comparar con firma en tiempo
  constante. La usará `POST /asistencia/marcar` (historia siguiente) para que solo
  el token vigente cree registros; registrar la asistencia queda fuera de esta historia.
- **Acceso.** Solo el instructor asignado: 403 `SIN_PERMISO` («Esta clase no está
  asignada a ti.») para otro instructor; coordinador, participante y admin reciben
  403 por la matriz de T-04. Clase inexistente: 404. Cancelada: 409 `CLASE_CANCELADA`.
- **`QR_SECRET`** es una variable requerida nueva (32+ caracteres, sin marcadores
  `CAMBIA`): el servidor no arranca sin ella (CFG-01). `npm run env:init` la genera.
- **`GET /api/instructor/clases`**: las clases `PROGRAMADA` del instructor
  autenticado, para llegar a la pantalla del QR.

## Criterios de aceptación

```gherkin
# language: es
Característica: QR temporal rotatorio

  Escenario: QR-01 Instructor asignado a una clase activa
    Dado Carlos, instructor asignado a una clase programada
    Cuando pide el QR de esa clase
    Entonces recibe un token firmado ligado a esa clase
    Y expiraEn vence como máximo 30 s después de servidorAhora
    Y duracionSegundos es 30

  Escenario: QR-02 El token está ligado a la clase y firmado
    Cuando se altera la clase, el vencimiento o la firma del token
    O se firma con otro secreto
    Entonces la verificación lo rechaza como INVALIDO
    Y el token sin alterar se verifica con su claseId

  Escenario: QR-03 Rotación cada 30 segundos
    Dado el QR emitido en una ventana de 30 s
    Cuando se pide otra vez dentro de la misma ventana
    Entonces el token es el mismo
    Cuando pasan los 30 s y la vista pide el QR otra vez
    Entonces recibe un token distinto
    Y el anterior se rechaza como EXPIRADO, mientras el nuevo es válido

  Escenario: QR-04 Clase de otro instructor
    Dado Lucía, instructora que no está asignada a la clase
    Cuando pide el QR de la clase de Carlos
    Entonces el servidor responde 403 SIN_PERMISO
    Y coordinador, participante y admin también reciben 403
    Y una clase cancelada responde 409 y una inexistente 404

  Escenario: QR-05 Sin QR_SECRET el servidor no arranca
    Dado que falta QR_SECRET o tiene el marcador de ejemplo
    Cuando se valida la configuración
    Entonces falla nombrando QR_SECRET

  Escenario: QR-06 Clases del instructor
    Cuando Carlos pide sus clases
    Entonces recibe solo sus clases programadas, no las canceladas ni las de Lucía

  Escenario: QR-07 Recorrido con el backend real
    Dado Carlos en el navegador con una clase programada
    Cuando abre «Mostrar QR»
    Entonces ve el código QR de asistencia y la cuenta regresiva
    Y al vencer, la pantalla recibe un token nuevo y lo muestra
```

## Pruebas

| ID | Tipo | Ubicación |
|---|---|---|
| QR-02, QR-03 | Unitaria (reloj explícito) | `backend/test/qr.test.ts` |
| QR-05 | Unitaria | `backend/test/env.test.ts`, `backend/test/env-init.test.ts` |
| QR-01, QR-03, QR-04, QR-06 | Integración (Postgres y Redis) | `backend/test/integracion/qr.test.ts` |
| QR-07 | E2E real | `e2e/prb/real/qr.spec.ts` |

## Ciclo aplicado (6 de octubre de 2026)

**Rojo.** Con la especificación y las pruebas escritas:

- Unitarias: QR-05 y CFG-06 fallaron porque `QR_SECRET` no existía en la
  configuración ni en `env:init`; QR-01…03 porque el módulo del token no existía.
- Integración: se implementó primero solo el token y se ejecutó la suite antes de
  tocar las rutas. Resultado: 4 correctas y **4 en rojo por comportamiento**
  (QR-01, QR-03, QR-04 de Lucía y QR-06), porque `/clases/:id/qr` e
  `/instructor/clases` respondían 501. Los 403/404/409 ya se cumplían desde HU-04.
- E2E QR-07: falló primero por un selector ambiguo (dos `svg` en la sección), no por
  el comportamiento; se corrigió la prueba. Su rojo de comportamiento no se ejecutó.

**Verde.** Token HMAC por ventanas de 30 s, rutas `/clases/:id/qr` e
`/instructor/clases`, `QR_SECRET` requerida. Resultado: unitarias del backend
127/127; integración 94/94 en una copia aislada de Docker Compose; E2E real 15/15,
con una rotación real observada en el navegador.
