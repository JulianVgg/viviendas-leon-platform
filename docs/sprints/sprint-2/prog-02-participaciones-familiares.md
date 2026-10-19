# PROG-02 — Asociar familias a programas

## Alcance

- Se mantiene el asistente integral de registro de familias y la asignación de uno o varios programas en una única transacción.
- Las participaciones nuevas del asistente tienen estado `ACTIVO` (o `FINALIZADO` si se consignó fecha de salida); los registros anteriores nulos permanecen sin transformación masiva.
- En `/familias/:id/editar` se añade **Programas asociados** y un formulario independiente para agregar y editar participaciones. El guardado general de la familia permanece independiente.
- La pestaña **Programas** del expediente (`/familias/:id`) sigue consultando las asociaciones registradas.
- No se borra ninguna relación histórica y no se modifica la restricción única `familia_id` + `programa_id`.

## Contrato de API

La autenticación se basa en la sesión existente y los permisos de escritura de familias (`FAMILIAS_WRITE` o Dirección general). Las consultas del expediente y opciones activas ya estaban implementadas.

- `POST /api/v1/familias/:id/programas`: requiere `Idempotency-Key: UUID v4` y cuerpo `{ "programaId": 2, "estado": "ACTIVO", "fechaIngreso": "2026-10-19", "fechaSalida": null, "observaciones": null }`. Devuelve `201` y `{data: participación}` o `200` si reproduce un POST confirmado.
- `PATCH /api/v1/familias/:id/programas/:participacionId`: cuerpo `{ "version": "123", "estado": "FINALIZADO", "fechaSalida": "2026-12-01" }`. Campos modificables: `estado`, `fechaIngreso`, `fechaSalida`, `observaciones`. Devuelve `{data: participación}`.
- `GET /api/v1/familias/:id/expediente`: cada elemento `programas[]` añade `version` (cadena PostgreSQL xmin), además de sus campos anteriores.

Estados de participación permitidos: `ACTIVO`, `FINALIZADO`, `RETIRADO`. El estado **del programa** (`ACTIVO`/`INACTIVO`) es independiente. Solo los programas institucionales activos se pueden asociar nuevamente; una relación anterior sigue siendo editable aunque el programa se desactive.

Respuestas: `400` para validación, `404` para familia o participación inexistente, `409` para duplicado, versión obsoleta o idempotencia incompatible, `401/403` por autenticación/autorización.

## Integridad, seguridad y auditoría

- Se comprueba que el programa exista y esté activo dentro de la misma transacción que inserta la relación, usando `FOR SHARE` para evitar carreras con su desactivación.
- La creación bloquea la familia para serializar las altas; además existe una clave única DB `(familiaId, programaId)` y verificación de duplicados.
- La actualización bloquea la participación con `FOR UPDATE` y coteja `xmin` para detectar cambios concurrentes.
- Las fechas deben existir y `fechaSalida >= fechaIngreso` cuando ambas se indiquen. No se cambia `programaId` en una relación existente.
- Se inserta una fila en `bitacora` en la misma transacción por cada alta o cambio efectivo.
- Las operaciones requieren conexión; no se añaden escrituras offline administrativas.

## Aplicación y pruebas

En una rama de trabajo, desde la raíz del repositorio:

```bash
git apply --check /ruta/PROG-02-asociacion-familias.patch
git apply /ruta/PROG-02-asociacion-familias.patch
npm install
npm run build
cd apps/api
node --test tests/family-programs.validation.test.mjs
```

Para probar persistencia, usar una base PostgreSQL **de desarrollo/QA** con migraciones aplicadas. Verificar: alta, replay de POST, duplicado, cambio de estado, bloqueo concurrente, integridad del expediente, 401/403 y fila en bitácora. Ejecutar también las pruebas existentes de familias (`npm run test -w @viviendas-leon/web`, y suite de backend configurada para QA).

**Dependencia:** PROG-01 ya debe disponer de catálogo de programas; no se cambia la interfaz de administración de programas. Esta funcionalidad usa el endpoint preexistente de familias `/api/v1/familias/opciones/programas` y funciona con el catálogo ya integrado.
