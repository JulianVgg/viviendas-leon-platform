# DB-07: Pruebas de integridad y rendimiento

## 1. Entorno de prueba

Ejecución realizada el 2026-10-05. El script reproducible es `apps/api/scripts/db-integrity-performance.ts`.

- Base: PostgreSQL temporal e independiente.
- Contenedor: `postgres:16-alpine`, contenedor `viviendas-leon-db-integrity`, puerto local `55432`.
- Preparación: migraciones actuales con `prisma migrate deploy` y `prisma db seed`.
- Datos: seed sintético actual (`apps/api/prisma/seed.ts`).
- Medición: `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)`.
- Aislamiento: las pruebas de acciones referenciales usan transacciones y `ROLLBACK`; no modifican los datos persistidos del seed.
- SLA: el proyecto no define un umbral formal. Los tiempos se valorarán frente al volumen de datos utilizado.

Las cuatro migraciones se aplicaron correctamente. El comando configurado para `prisma db seed` falló por resolver `apps/api/prisma/seed.ts` como `apps/api/apps/api/prisma/seed.ts`; se ejecutó el mismo seed directamente desde `apps/api` con `npx tsx prisma/seed.ts`, sin modificar el seed ni la configuración.

## 2. Estructura realmente aplicada

El `schema.prisma` declara `Huerto.familia` con `ON DELETE RESTRICT`, pero la migración `20261005060000_adjust_db04_foreign_keys` aplica explícitamente `ON DELETE CASCADE` en `huerto.familia_id`. La prueba se basó en la base resultante de las migraciones y confirmó el comportamiento real, sin corregir la discrepancia.

DB-05 documenta restricciones `CHECK`, pero el schema no declara ninguna y las migraciones revisadas no contienen `ADD CONSTRAINT ... CHECK`. La consulta contra `pg_constraint` confirmó que no existen en la base aplicada.

## 3. Pruebas de restricciones

| Prueba | Esperado | Obtenido |
| --- | --- | --- |
| FK inválida en `comunidad.municipio_id` | Rechazo por FK | Rechazada por `comunidad_municipio_id_fkey` |
| `NOT NULL` en `municipio.nombre` | Rechazo por NOT NULL | Rechazada por NOT NULL |
| `UNIQUE` en `municipio.nombre` | Rechazo de duplicado | Rechazada por `municipio_nombre_key` |
| Auditoría de CHECK reales | Reportar existentes, sin inventarlos | No existen CHECK en `public` |

## 4. Pruebas de integridad referencial

| Acción | Relación probada | Esperado | Obtenido |
| --- | --- | --- | --- |
| CASCADE | `familia -> integrante_familia` | Los integrantes se eliminan | 0 integrantes restantes |
| CASCADE real de discrepancia | `familia -> huerto` | La migración elimina el huerto | 0 huertos restantes |
| RESTRICT | `municipio -> comunidad` | El municipio no se elimina | Rechazado por `comunidad_municipio_id_fkey` |
| SET NULL | `condicion_climatica -> visita` | La FK de visita queda NULL | `condicion_climatica_id = NULL` |
| Auditoría | Todas las FK aplicadas | Cero referencias inválidas | 0 en 54 FK |

## 5. Consultas ejecutadas y tiempos

El script ejecuta una consulta representativa por módulo: familias/comunidades, huertos/cultivos, producción/ventas, visitas/evaluaciones/seguimiento, capacitaciones, insumos y seguridad/roles/permisos. Para cada una registra `Planning Time` y `Execution Time` en milisegundos junto con el plan de PostgreSQL.

| Módulo | Planning Time (ms) | Execution Time (ms) | Evaluación |
| --- | ---: | ---: | --- |
| Familias/comunidades | 0.346 | 0.403 | Razonable para 3 comunidades y 3 familias; sin SLA formal |
| Huertos/cultivos | 0.258 | 0.220 | Razonable para 3 huertos y 3 ciclos; sin SLA formal |
| Producción/ventas | 0.351 | 0.277 | Razonable para 2 producciones y 2 ventas; sin SLA formal |
| Visitas/evaluaciones/seguimiento | 0.341 | 0.350 | Razonable para 3 visitas, 3 evaluaciones y 2 seguimientos; sin SLA formal |
| Capacitaciones | 0.197 | 0.213 | Razonable para 2 capacitaciones; sin SLA formal |
| Insumos | 0.246 | 0.165 | Razonable para 3 insumos y 3 detalles; sin SLA formal |
| Seguridad/roles/permisos | 0.202 | 0.302 | Razonable para 3 usuarios, roles y permisos; sin SLA formal |

## 6. Resultados y conclusión

Todas las pruebas ejecutadas pasaron. No se encontraron referencias inválidas. Las restricciones FK, NOT NULL y UNIQUE rechazaron los datos inválidos; CASCADE, RESTRICT y SET NULL coincidieron con la base aplicada. Las consultas críticas terminaron entre 0.165 ms y 0.403 ms con el volumen sintético, por lo que son razonables para ese volumen; esto no constituye una garantía para cargas mayores porque no existe SLA formal.

Hallazgos: `schema.prisma` declara `Huerto.familia` como `RESTRICT`, pero la base resultante de `20261005060000_adjust_db04_foreign_keys` lo ejecuta como `CASCADE`; la prueba obtuvo 0 huertos tras eliminar la familia. DB-05 menciona CHECK, pero no hay CHECK en la base aplicada. Tampoco se modificaron schema, migraciones ni seed.
