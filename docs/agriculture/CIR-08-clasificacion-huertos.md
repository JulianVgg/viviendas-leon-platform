# CIR-08 — Clasificación productiva de huertos

Issue #233. Clasificación independiente de la asociación con familias y de los ciclos agrícolas.

## Campos

- `tipo`: `FAMILIAR` / `COMUNITARIO`; identifica la titularidad o escala organizativa.
- `entornoCultivo`: `CAMPO_ABIERTO` / `MACROTUNEL` / `MIXTO` / `OTRO`; identifica el entorno de producción (selección principal).
- `detalleEntorno`: obligatorio solo si el entorno es `OTRO`.
- `modalidadesProductivas`: una o varias de `AGRICOLA`, `AGROFORESTAL`, `SILVOPASTORIL`.

**Sin clasificar** se representa como `NULL` en tipo/entorno y arreglo vacío en modalidades. La migración no deduce datos desde observaciones, fotografías ni nombres de huertos. Ningún dato histórico cambia de clasificación automáticamente.

## Permisos y operaciones

- Alta: `POST /api/v1/huertos` (permiso `HUERTOS_WRITE`).
- Actualización: `PATCH /api/v1/huertos/:id/clasificacion` (permiso `HUERTOS_WRITE`), solo modifica clasificación y agrega bitácora. No cambia familia, ciclos, cosechas ni imagen.
- Consulta: `GET /api/v1/huertos` incluye los campos nuevos para mostrar filtros/reportes futuros. La consulta sigue requiriendo sesión.
- Interfaz: Gestión agrícola → Huertos → Editar clasificación, o Alta de huerto. También se muestra en el expediente familiar.

## Despliegue y validación

1. Respaldar PostgreSQL.
2. Aplicar migraciones (`cd apps/api && npx prisma migrate deploy --config prisma7.config.ts`).
3. Generar Prisma (`npx prisma generate --config prisma7.config.ts`).
4. Compilar y probar (`npm run build`; `node --test apps/api/tests/cir08-clasificacion-huertos.test.mjs apps/api/tests/gardens.validation.test.mjs`).
5. Revisar huertos existentes uno por uno con el personal técnico y guardar la clasificación confirmada. **No hay importación masiva automática**.
6. Verificar el historial de ciclos y cosechas, y que el usuario sin permiso no pueda editar.

Si un huerto utiliza varias estructuras y requiere una descripción más específica, `MIXTO` y observaciones pueden utilizarse provisionalmente. La clasificación detallada de estructuras múltiples debe validarse con ViviendasLeón antes de crear entidades adicionales.
