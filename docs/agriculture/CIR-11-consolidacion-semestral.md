# CIR-11 — Consolidación semestral de producción agrícola

**Issue:** #236 · **Módulo:** Reportes · **Alcance:** API / consultas / validación, sin exportación Excel.

## Estado previo

`apps/api/src/modules/reports/` estaba vacío. El módulo Producción disponía de un listado con límite de 500 registros y el Dashboard utilizaba ventanas móviles de 3, 6 o 12 meses. Ninguna consulta generaba el informe semestral institucional.

## Endpoint

`GET /api/v1/reportes/produccion-semestral?anio=2026&semestre=2`

Filtros opcionales: `familiaId` y `comunidadId` (IDs positivos). Requiere una sesión válida y permiso `PANTALLA_REPORTES_LISTA`, salvo Dirección General según el middleware vigente. Devuelve `Cache-Control: private, no-store`.

Ejemplo desde el navegador con sesión iniciada: `fetch('/api/v1/reportes/produccion-semestral?anio=2026&semestre=2', { credentials: 'same-origin' }).then(r => r.json()).then(console.log)`.

La respuesta `data` contiene:

- `periodo`: semestre exacto (01/01–30/06 o 01/07–31/12).
- `filtros`: año, semestre y filtros aplicados.
- `resumen`: número de cosechas, ventas, cantidades por tipo de unidad, importes originales GTQ/USD y registros excluidos o pendientes de revisión.
- `porCultivo`: agregados por cultivo, con cantidades independientes en kg, unidades y manojos; conteo único de ciclos y plantas iniciales registradas, ventas e importes originales.
- `detalleCosechas` y `detalleVentas`: registros asociados a familia, comunidad y ciclo para la trazabilidad y la futura hoja de detalle de CIR-13.
- `advertencias` y `notas`: motivos de datos incompletos/excluidos, posibles duplicados y limitaciones del informe.
- `estadoValidacion`: `PRELIMINAR`; no representa un informe aprobado por Dirección.

## Reglas de cálculo

1. **Solo cosecha real:** consulta `RegistroProduccion` y `DetalleProduccion`, nunca las proyecciones de las visitas.
2. **Semestre de cosecha:** el registro completo debe estar dentro del semestre. Un período que cruce semestres se señala y excluye temporalmente, sin prorratearlo. Su criterio definitivo debe aprobarlo Coordinación (DV-07).
3. **Semestre de venta:** consulta la fecha de `RegistroVenta`, aunque la cosecha relacionada sea de otro semestre. Las ventas sin fecha no son atribuibles automáticamente.
4. **Diferencia de unidades:** se suman por separado kg, unidades y manojos, sin conversiones supuestas. Se conservan tres decimales en cosechas.
5. **Importes:** cantidad vendida × precio unitario de la venta, con redondeo `HALF_UP` a centavos **por operación**. GTQ y USD son totales de ventas en su **moneda original**: no se suman ni se consideran importes convertidos. Las tasas históricas de CIR-10 se aprovecharán al construir las columnas equivalentes del Excel (CIR-12), si están disponibles y documentadas.
6. **Plantas:** `CicloCultivo.cantidadPlantas` es un valor inicial. Se contabiliza una vez por ciclo; no constituye evidencia de plantas productivas del semestre. La producción *por planta* permanece `null` hasta que la ONG confirme y proporcione un denominador válido (DV-02/DV-03, RA-08). No se presenta un cero inventado.
7. **Datos incompletos:** ventas con varios precios, precios ausentes, cantidades incompatibles y registros de períodos cruzados generan advertencias. No se inventan cifras ni conversiones.
8. **Datos de prueba:** se excluyen registros identificados por marcadores `SYN-`, nombres sintéticos o comunidades explícitamente "de prueba". Es un mecanismo conservador; los registros de prueba creados manualmente sin esos marcadores todavía deben revisarse antes de emitir informes oficiales.
9. **Integridad:** los registros se consultan por ID, sin límite de 500, con paginación y una transacción de lectura `REPEATABLE READ` para mantener consistente la fotografía de cosechas y ventas.
10. **Duplicados:** una misma fila obtenida más de una vez por su ID solo se contabiliza una vez. Movimientos distintos con ciclo, fecha, cantidad, unidad y precio iguales se señalan como *posibles duplicados*: no se eliminan sin verificación humana porque también podrían representar operaciones legítimas.

## Verificaciones

```bash
node --experimental-strip-types --test apps/api/tests/cir11-semestre.test.mjs
npm run build
```

Verificar en un entorno con registros reales: filtros por comunidad/familia, permisos de Dirección/Coordinación, resultado con >500 cosechas, registros incompletos, y contraste de totales con los expedientes originales.

## Fuera de alcance de CIR-11

- Generación y formato `.xlsx` (CIR-12).
- Hoja de detalle institucional y trazabilidad en exportación (CIR-13).
- Interfaz de filtros y descargas (CIR-14).
- Validación/aprobación del informe (CIR-15).
- Decisiones contables y productivas pendientes de confirmación institucional en CIR-01.

**No exige migración de Prisma**, inserción de datos ni cambios en el formulario de visitas.
