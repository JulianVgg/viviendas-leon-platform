# NTF-03 — Generación automática de notificaciones por actividades del calendario (#172)

## Alcance

Esta historia **no modifica** el diseño de la campanita ni crea recordatorios de fechas futuras (NTF-04/05), invitaciones o confirmaciones de asistencia (NTF-09/10), alertas de visitas vencidas (NTF-08) ni push (NTF-11/12).

- El calendario institucional notifica a participantes explícitamente vinculados al evento; el creador NO es destinatario automático, salvo que también figure como participante.
- Al crear un evento se envía `CALENDARIO_ASIGNACION` a los participantes.
- Al editarlo se notifica `CALENDARIO_ASIGNACION` a los nuevos, `CALENDARIO_DESASIGNACION` a los retirados y `CALENDARIO_CAMBIO` a los que permanecen **solo si cambió título, categoría, descripción o fecha**.
- Al eliminarlo se envía `CALENDARIO_CANCELACION` a los participantes aún vinculados.
- Al sincronizar por primera vez una visita `PROGRAMADA` se envía `VISITA_PROGRAMADA` al técnico responsable; al cambiar su fecha, `VISITA_REPROGRAMADA`; al eliminar la cita pendiente, `VISITA_CANCELADA`.
- Las visitas `REALIZADA` y los compromisos no generan alertas en esta historia.
- La referencia abre `/calendario` o `/visitas/agenda`. La UI de NTF-02 comprueba también el permiso de navegación.

## Destinatarios, seguridad e idempotencia

1. Los destinatarios se obtienen exclusivamente de `evento_institucional_participante` y `visita.usuario_responsable_id`. El cliente no envía receptores de notificaciones.
2. La API usa exclusivamente usuarios `ACTIVO` y roles activos con `PANTALLA_CALENDARIO` o `PANTALLA_VISITAS_AGENDA`. Dirección general mantiene su acceso institucional. Si el usuario no tiene permiso para ver el módulo, no recibe datos de esa actividad.
3. Eventos, visitas y avisos se modifican en **una transacción**; si falla la notificación, falla la operación completa. No se envían notificaciones sobre operaciones fallidas.
4. Las ediciones usan bloqueo de fila y `version_notificacion`. Un `PUT`/`PATCH` repetido sin cambios no vuelve a notificar, aunque se repita en paralelo.
5. `notificacion.clave_evento` es única (nullable); `createMany(skipDuplicates)` evita introducir dos veces el mismo aviso de una operación.
6. En `visitas/sync`, el UUID `operationId` que ya existe en la PWA conserva la idempotencia; no se crean avisos en reintentos.
7. El navegador manda `X-Operation-Id` UUID v4 en cada nuevo `POST /calendario`. Un reintento con el **mismo UUID y los mismos datos** reutiliza el evento; otro payload con ese UUID da `409`. Los clientes anteriores pueden omitir la cabecera para mantener compatibilidad; en ese caso NO disponen de idempotencia del POST. Cuando se llame de nuevo a `saveEvent` como operación nueva, se genera otro UUID deliberadamente.

La migración incorpora columnas auxiliares con valores por defecto sin borrar, renombrar ni duplicar eventos ni visitas existentes. La tabla `alerta` sigue siendo independiente de `notificacion`.

## Migración y puesta en marcha (desde la raíz)

La base de datos PostgreSQL debe estar encendida y `apps/api/.env` configurado. El código de NTF-01 y NTF-02 debe estar ya en la rama o en `main`.

```bash
git apply --check NTF-03-cambios.patch
git apply NTF-03-cambios.patch

cd apps/api
npx prisma migrate deploy --config prisma7.config.ts
npx prisma generate --config prisma7.config.ts
cd ../..

npm run build
node --test apps/api/tests/notifications.activity.test.mjs apps/api/tests/notifications.recipients.test.mjs
npm run dev
```

**Importante:** ejecutar `prisma generate` después de la migración y antes de compilar, porque el cliente generado debe reconocer `claveEvento`, `versionNotificacion` y `operacionCreacionId`. No copiar los archivos `generated/` del ZIP original sobre el cliente actualizado.

## Pruebas de aceptación manuales

Utilizar al menos tres usuarios de prueba activos, con permisos conocidos. No utilizar nombres reales de beneficiarios en datos sintéticos.

| # | Escenario | Resultado esperado |
| - | - | - |
| 1 | Dirección crea capacitación e incluye a técnicos A y B | Ambos reciben asignación, usuario C no recibe nada |
| 2 | Dirección cambia únicamente fecha del evento | A y B reciben cambio; la fecha de la actividad se conserva |
| 3 | Se guarda el mismo evento con datos idénticos | Cero avisos adicionales |
| 4 | Se retira a B de los participantes | B recibe desasignación y A no recibe aviso si no cambió el detalle |
| 5 | Se agrega a C y se modifica la descripción | C recibe asignación y A recibe cambio; B no recibe detalle nuevo |
| 6 | Dirección elimina el evento | Participantes actuales reciben cancelación; evento deja de aparecer |
| 7 | Se programa una visita técnica con sincronización | Responsable recibe `VISITA_PROGRAMADA` |
| 8 | Se reenvía exactamente el mismo `operationId` de sincronización | No se crea otra visita ni otro aviso |
| 9 | Se cambia fecha de visita programada | Responsable recibe `VISITA_REPROGRAMADA` una sola vez |
| 10 | Se envía el mismo PATCH sin cambiar fecha | No se crea otro aviso |
| 11 | Se elimina la visita programada | Responsable recibe `VISITA_CANCELADA` y la agenda ya no la muestra |
| 12 | Se da de baja o se quita el permiso de pantalla a un usuario | El usuario no recibe avisos nuevos para ese módulo |
| 13 | Se intenta editar calendario con un rol sin autorización | HTTP 403, sin cambio ni notificaciones |
| 14 | Se reenvía un `POST` con mismo `X-Operation-Id` y payload | HTTP 200, `duplicate:true`, mismo ID y sin nuevos avisos |
| 15 | Se reutiliza ese UUID con payload distinto | HTTP 409, no modifica evento ni genera avisos |

## Consulta para diagnóstico

```sql
SELECT id, usuario_id, tipo, titulo, referencia, clave_evento,
       fecha_creacion, fecha_lectura
FROM notificacion
WHERE clave_evento IS NOT NULL
ORDER BY id DESC
LIMIT 30;
```

Para inspeccionar destinatarios por rol se recomienda usar cuentas de prueba distintas y comprobar el panel de cada sesión: `GET /api/v1/notificaciones` siempre filtra por usuario autenticado (NTF-01).

## Archivos tocados

- `apps/api/prisma/schema.prisma`
- `apps/api/prisma/migrations/20261021170000_ntf03_eventos_notificaciones/migration.sql`
- `apps/api/src/modules/calendar/calendar.routes.ts`
- `apps/api/src/modules/visits/visits.routes.ts`
- `apps/api/src/modules/notifications/notifications.service.ts`
- `apps/api/src/modules/notifications/notifications.activity.ts`
- `apps/web/src/features/calendar/services/calendarService.ts`
- `apps/api/tests/notifications.activity.test.mjs`
- `apps/api/tests/notifications.recipients.test.mjs`
- `docs/NTF-03-generacion-notificaciones-calendario.md`

## Validación realizada al generar este parche

- 11 pruebas unitarias pasaron (reglas de asignación/cambio/retirada, permisos, claves únicas y validación de referencias).
- `tsc -b apps/web/tsconfig.json`: correcto con TypeScript del proyecto.
- Compilación backend: correcta tras sustituir **solo en una copia temporal de validación** los tipos de campos Prisma aún sin regenerar; código del parche no incorpora estos cambios temporales.
- No fue posible ejecutar Prisma `generate` ni una prueba de integración real con PostgreSQL desde el entorno Linux porque el archivo proporcionado solo contiene el motor de Prisma para Windows y no hay acceso a la descarga del motor Linux. La verificación real debe hacerse localmente en Windows antes del PR.
