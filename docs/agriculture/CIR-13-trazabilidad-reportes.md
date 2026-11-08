# CIR-13 — Detalle y trazabilidad del reporte semestral

**Issue:** #238. Complementa CIR-11 (consolidación) y CIR-12 (Excel institucional).

## Resultado

`GET /api/v1/reportes/produccion-semestral.xlsx?anio=2026&semestre=2`

Genera **dos hojas** en un solo archivo:

1. **Producciones agrícolas:** conserva exactamente las 12 columnas y el final en `TOTAL SEMESTRAL`. No incluye notas técnicas debajo de la tabla.
2. **Detalle de registros:** cosechas reales y ventas por registro, con sus IDs, cultivo, familia, comunidad, huerto, ciclo, visita de origen (cuando exista), fechas, unidad, cantidad, precio, moneda, importe y observaciones disponibles.

Se usa la misma consulta protegida por sesión y `PANTALLA_REPORTES_LISTA`, los mismos filtros de año/semestre/comunidad/familia y el mismo snapshot de CIR-11. No se publican datos en otra API ni se copian estimaciones como ingresos.

## Reglas de trazabilidad

- Cada fila **COSECHA** representa un detalle de producción válido, con `ID registro` = cosecha y `ID detalle` = detalle de esa cosecha.
- Cada fila **VENTA** representa una venta del semestre, con `ID registro` = venta y `ID cosecha` = cosecha de origen. Puede referirse a una cosecha de un semestre previo: no se repite dicha cosecha en el período actual.
- Se conservan `ID ciclo`, `ID cultivo`, `ID familia` y `ID huerto` para encontrar registros aun cuando existan nombres repetidos.
- Los importes GTQ y USD son valores reales en **moneda original**, sin conversión ni doble conteo. Las ventas incompletas permanecen visibles sin inventar importe.
- No se incorporan cosechas excluidas por período cruzado, unidades inválidas, datos sintéticos identificados ni estimaciones de visitas. Las advertencias de calidad siguen en CIR-11.
- La hoja de detalle contiene una sección separada de **conciliación** con sumas por kg, unidades, manojos, GTQ y USD. Si no coinciden los totales del detalle y el resumen, el servidor bloquea la exportación.
- Los nombres y observaciones se exportan como texto seguro para evitar ejecución de fórmulas desde contenido ingresado por usuarios.

## Verificación

Desde la raíz del repositorio, con ExcelJS instalado y la API compilada:

```bash
npm run build
node --test apps/api/tests/cir13-trazabilidad.test.mjs apps/api/tests/cir13-excel-archivo.test.mjs
```

Descargar el Excel desde la ruta existente de CIR-12, seleccionar la segunda pestaña y verificar filtro, IDs, fechas, valores y conciliación. Confirmar que la primera hoja permanezca visualmente igual y que los registros correspondan al semestre solicitado.

No necesita migraciones Prisma. El acceso al archivo contiene nombres de participantes; conservarlo y compartirlo únicamente con personal autorizado.
