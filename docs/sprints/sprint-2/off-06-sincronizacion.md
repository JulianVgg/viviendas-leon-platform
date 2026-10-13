# OFF-06 — Sincronizar información pendiente (#72)

## Objetivo
Enviar al backend operaciones capturadas offline y confirmar localmente solo después de que PostgreSQL las haya persistido. Evitar duplicados mediante un identificador idempotente y conservar operaciones fallidas para reintentar.

## Alcance de esta implementación

**Demostración técnica real:** operaciones `demo.field-note.create` de OFF-03, almacenadas como notas sintéticas en una tabla separada de PostgreSQL (`offline_demo_note`). No son visitas reales ni registros de beneficiarios. Endpoint disponible exclusivamente en desarrollo local con `ENABLE_OFFLINE_DEMO_SYNC=true` y `NODE_ENV` distinto de `production`.

En producción **no** se envían operaciones por este mecanismo. Para operaciones reales faltan autenticación, autorización, alcance por usuario/dispositivo y el endpoint transaccional específico de visitas o familias.

## Contrato HTTP

`POST /api/v1/offline/demo-notes`

```json
{
  "operationId": "uuid-v4-de-la-cola",
  "kind": "demo.field-note.create",
  "payload": { "title": "Visita sintética", "observation": "Texto ficticio" }
}
```

- **201**: primera inserción. `{ "operationId": "...", "accepted": true, "duplicate": false }`
- **200**: el mismo UUID y el mismo contenido ya estaban persistidos. `{ "operationId": "...", "accepted": true, "duplicate": true }`
- **400**: entrada inválida.
- **409**: UUID reutilizado con contenido diferente (no se confirma).
- **404**: endpoint de demostración deshabilitado.
- **503**: no se pudo persistir la operación.

La columna `operation_id UUID PRIMARY KEY` impide inserciones duplicadas incluso con dos solicitudes simultáneas.

## Flujo de cliente

1. OFF-03 crea operación con UUID y estado `pending`.
2. OFF-05 verifica que `/api/health` responde y anuncia recuperación, o se utiliza el botón manual de prueba.
3. OFF-06 toma operaciones demo en estado `pending` o `failed` y usa `processQueueOperation` de OFF-04.
4. Estado `syncing`, contador de intentos +1.
5. La API inserta o reconoce idempotentemente el mismo UUID en PostgreSQL.
6. Solo ante HTTP 2xx + cuerpo `{accepted:true, operationId: UUID original}` cambia a `synced` con `syncSource:'server'`.
7. Errores HTTP, de red, formato de respuesta o conflictos conservan el registro como `failed`, sin pérdida del contenido.

Las confirmaciones simuladas de OFF-04 (`syncSource:'simulation'`) no se reenvían: debe crearse una nueva operación ficticia para probar una sincronización real.

## Preparación

- Confirmar rama de OFF-06 y árbol limpio.
- Copiar los archivos del paquete sin reemplazar carpetas completas.
- Verificar que el archivo `apps/api/prisma7.config.ts` preexistente tenga la conexión `DATABASE_URL` configurada en `apps/api/.env`.
- Agregar a `apps/api/.env` únicamente `ENABLE_OFFLINE_DEMO_SYNC=true`, sin publicar contraseñas ni ese archivo en Git.
- Aplicar la migración desde `apps/api`: `npx prisma migrate deploy --config prisma7.config.ts`.
- Regenerar cliente si corresponde: `npx prisma generate --config prisma7.config.ts`.
- Desde la raíz: `npm run build -w @viviendas-leon/api` y `npm run build -w @viviendas-leon/web`.
- Ejecutar `npm run dev` y abrir `/offline-sync-test` en `localhost:5173`.

## Pruebas y evidencias

- [ ] Crear una **nueva** operación sintética en `/offline-operations-test` con DevTools en Offline.
- [ ] Recuperar red y comprobar que el backend confirma la operación y el registro deja de estar pendiente (automático al detectar recuperación o manual).
- [ ] Consultar tabla `offline_demo_note` en PostgreSQL: exactamente una fila por UUID.
- [ ] Pulsar **Verificar no duplicación en API** para el registro confirmado: la API devuelve `duplicate:true` y no inserta una fila adicional.
- [ ] Crear otra operación, detener solo backend y realizar un intento de envío (o desactivar el endpoint temporalmente). Verificar que el registro permanece como `failed` o `pending`.
- [ ] Reiniciar backend, reintentar y comprobar confirmación sin duplicados.
- [ ] Recargar la página y comprobar que IndexedDB conserva intentos y estados.
- [ ] Confirmar que los registros marcados `synced` solo por una **simulación** no se envían al servidor.
- [ ] Confirmar ausencia de información personal real.

## Limitaciones y condiciones para producción

Esta implementación NO cumple por sí sola la sincronización de visitas o familias reales. Antes de habilitarla para la ONG, implementar endpoint de negocio autenticado y con permisos, la operación real y el recibo idempotente en **una misma transacción**, validación exhaustiva de datos, aislamiento por organización/usuario y una estrategia de conflictos, conservación, revocación y limpieza de IndexedDB. El acuse debe vincularse al usuario y al ámbito autorizados, no solo a un UUID arbitrario.

Refs #72
