# CIR-12 — Exportación Excel de producciones agrícolas

**Issue:** #237 · **Estado:** implementación del formato semestral, sin interfaz de descargas (CIR-14).

## Objetivo y fuente

Reproducir la tabla de 12 columnas de **PRODUCCIONES AGRÍCOLAS** entregada por ViviendasLeón (informe julio–diciembre de 2025), conservando el orden de encabezados, encabezado del proyecto, período semestral, bordes y fondo azul. El archivo siempre se identifica como **PRELIMINAR** hasta que exista un procedimiento de revisión y aprobación (CIR-15).

## Descarga

Ruta protegida con sesión y permiso `PANTALLA_REPORTES_LISTA` (las mismas reglas que CIR-11):

`GET /api/v1/reportes/produccion-semestral.xlsx?anio=2026&semestre=2`

Filtros opcionales: `comunidadId`, `familiaId`. Entrega `.xlsx` como archivo adjunto, sin caché. La página con filtros y botón de exportación se implementará en CIR-14.

## Correspondencia de las columnas

| Columna | Dato de CIR-11 |
|---|---|
| No., cultivos | Enumeración y cultivo de `porCultivo` |
| Cantidad de plantas | Plantas **iniciales** registradas; no plantas productivas verificadas |
| Producto obtenido por planta (unidades / kg) | Vacío hasta contar con denominador productivo validado |
| Total producción obtenida (unidades / kg) | Cosechas reales del semestre, **sin** estimaciones de visitas |
| Precio de venta (Q / USD) | Valor unitario solo si todas las ventas válidas de ese cultivo y moneda comparten precio y unidad; de otro modo vacío y observación |
| Total de venta (Q / USD) | Sumatoria de importes de ventas reales **en su moneda de origen**, asignados por fecha de venta |
| Observaciones | Observaciones de cosechas y cantidad en manojos (el formato histórico no tiene una columna propia para ellos) |

Los valores **en blanco no significan cero**. Los importes GTQ y USD no se suman ni representan equivalencias automáticas: las tasas históricas deben estar verificadas antes de incluir conversiones institucionales. Las ventas de una cosecha de otro semestre se incluyen por fecha de venta; las cosechas que cruzan semestres quedan fuera según CIR-11. Los registros sintéticos identificables se excluyen.

El resultado incluye fórmulas Excel `SUM` para totales de unidades, kg, GTQ y USD, con resultados guardados en caché basados en el mismo consolidado CIR-11. El archivo institucional termina en la fila de TOTAL SEMESTRAL, sin notas técnicas debajo ni texto en el pie de impresión. Las advertencias de calidad de datos permanecen disponibles en la respuesta de la API para su revisión interna. El detalle por registro y su conciliación se incluyen en una segunda hoja mediante CIR-13; la hoja institucional conserva su presentación original.

## Dependencias, instalación y verificación

Como ExcelJS no formaba parte de las dependencias del proyecto, instalarlo **desde la raíz** después de aplicar el patch:

```bash
npm install exceljs@^4.4.0 -w @viviendas-leon/api
npm run build
node --experimental-strip-types --test apps/api/tests/cir12-excel-datos.test.mjs
node --experimental-strip-types --test apps/api/tests/cir12-excel-archivo.test.mjs
```

La instalación actualiza `package-lock.json`; incluirlo en el PR junto con `apps/api/package.json`. No requiere migraciones ni modifica datos existentes.

Probar en Excel el formato de impresión horizontal y comprobar el período y los totales, verificando que no se impriman notas técnicas debajo de la tabla. Verificar errores 400 (filtros inválidos), 401 (sin sesión) y 403 (sin permiso), además del flujo de descarga válido.
