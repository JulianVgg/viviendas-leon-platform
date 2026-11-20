# FIX18 — Huertos, tasa institucional y programa Huertos

## Cambios
- Modalidades nuevas: Pecuario, Agropecuario y Agroindustria; no se borran Agrícola, Agroforestal ni Silvopastoril.
- Nuevos huertos: solo clasificación Familiar; se conservan los registros comunitarios históricos.
- Solo se puede crear un huerto para una familia con participación **ACTIVO** y sin fecha de salida en el programa **Huertos**. La pantalla de expediente avisa si falta la participación.
- Migración enlaza todas las familias que ya tengan huerto con el programa Huertos, sin duplicar vínculos. Si existe huerto activo, reactiva la participación. También impide eliminar o finalizar dicha participación mientras haya huertos activos o planificados.
- Administración → Cambios: tasa institucional de referencia, inicialmente **7.60 GTQ/USD**, con permisos y auditoría.
- Reportes: la tarjeta USD y la gráfica de ventas en USD muestran equivalencias al tipo de cambio institucional **actual**; conservan las cantidades originales GTQ y USD. No representan nuevos ingresos ni la cotización histórica de cada venta.
- Las tasas registradas por fecha en `tipo_cambio` siguen intactas.

## Aplicación
1. Respalda PostgreSQL de Railway antes de migrar.
2. En la raíz: `git apply --check <archivo.patch>` y `git apply <archivo.patch>`.
3. Ejecuta desde `apps/api`: `npx prisma migrate deploy --config prisma7.config.ts` en la base que deseas actualizar. **Primero local y luego Railway**. Revisa a qué base apunta `DATABASE_URL`.
4. `npx prisma generate --config prisma7.config.ts` y `npm run build` desde la raíz.
5. Verifica en Railway que el servicio API ejecute las migraciones antes de desplegar el frontend nuevo.
6. Inicia sesión otra vez para actualizar permisos de `PANTALLA_TIPO_CAMBIO`.

## Verificaciones de datos
```sql
SELECT p.nombre, COUNT(*) AS familias_con_huerto_y_programa
FROM familia_programa fp JOIN programa p ON fp.programa_id=p.id
WHERE lower(p.nombre)='huertos' GROUP BY p.nombre;

SELECT h.familia_id FROM huerto h
WHERE NOT EXISTS (
 SELECT 1 FROM familia_programa fp JOIN programa p ON fp.programa_id=p.id
 WHERE fp.familia_id=h.familia_id AND lower(p.nombre)='huertos'
);
```
La segunda consulta debe devolver cero filas tras la migración.
