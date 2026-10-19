# FAM-06 — Administrar comunidades

Issue: https://github.com/JulianVgg/viviendas-leon-platform/issues/43

## Alcance

- Administración → Comunidades: listado, búsqueda, filtro de estado, alta, edición y cambio de estado.
- Catálogo de municipios activos (solo lectura).
- Permisos `PANTALLA_COMUNIDADES` (lectura administrativa) y `COMUNIDADES_WRITE` (mutaciones).
- Registro de movimientos en `bitacora` dentro de la misma transacción.
- No se eliminan físicamente comunidades ni se modifica el contrato de `GET /api/v1/comunidades` utilizado por Familias.

## API

- `GET /api/v1/comunidades`: catálogo de comunidades activas existente, sin cambios.
- `GET /api/v1/comunidades/administracion`: catálogo completo, requiere `PANTALLA_COMUNIDADES`.
- `GET /api/v1/municipios`: municipios activos, requiere `PANTALLA_COMUNIDADES`.
- `POST /api/v1/comunidades`: `nombre`, `municipioId`, requiere `COMUNIDADES_WRITE`.
- `PATCH /api/v1/comunidades/:id`: actualiza nombre y municipio, requiere `COMUNIDADES_WRITE`.
- `PATCH /api/v1/comunidades/:id/estado`: `activo: boolean`, requiere `COMUNIDADES_WRITE`.

Las altas y modificaciones comprueban que el municipio esté activo. Se evita duplicar el nombre de comunidad dentro del mismo municipio ignorando mayúsculas. Una comunidad con familias en estado `ACTIVA` no puede desactivarse. No se implementa CRUD de municipios ni se permite editar datos en modo sin conexión.

## Despliegue y pruebas

1. Instalar dependencias (`npm ci`) y aplicar migraciones con la configuración Prisma 7 del backend.
2. Ejecutar compilaciones (`npm run build`) y pruebas de validación (`npm run build -w @viviendas-leon/api` seguido de `node --test apps/api/tests/communities.validation.test.mjs`).
3. Probar con Dirección general y Coordinadora del programa agroforestal; con Técnico agropecuario sin permisos, las operaciones deben devolver `403`.
4. Crear y editar comunidad. Comprobar `bitacora` y recarga del catálogo.
5. Registrar/editar una familia con la comunidad recién creada. El selector existente debe mostrarla si comunidad y municipio están activos.
6. Intentar desactivar una comunidad con familia activa (`409`); reasignar o cambiar estado de la familia antes de desactivar.
7. Probar móvil y escritorio, errores de red, duplicados y búsqueda.

La migración de permisos asigna lectura y escritura a Dirección general y Coordinadora del programa agroforestal, si esos roles ya existen. Comprueba las asignaciones de roles en cada ambiente antes de aceptar el issue.
