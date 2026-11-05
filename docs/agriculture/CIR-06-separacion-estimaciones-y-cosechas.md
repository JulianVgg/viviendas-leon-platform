# CIR-06 — Separación de estimaciones de visitas y cosechas reales

Issue: #231 · Epic: Validaciones

## Reglas

1. La estimación de una visita técnica tiene `origenProduccion: ESTIMACION_VISITA` y se guarda dentro de `visita_captura.datos.crops`. Su cantidad se calcula orientativamente a partir de plantas observadas y producción por planta. No crea filas de `registro_produccion` ni de `registro_venta`.
2. Las capturas antiguas almacenadas en JSONB o pendientes en IndexedDB no requieren migración: cuando `production === true`, la API de visitas las presenta como `ESTIMACION_VISITA` sin modificar el registro histórico; el frontend también reconoce el indicador legado.
3. Una cosecha formal se registra exclusivamente a través de `/api/v1/producciones` en `registro_produccion` y `detalle_produccion`, ligada a `ciclo_cultivo_id`. Las respuestas del endpoint incluyen `origenProduccion: COSECHA_REAL`.
4. Los indicadores de kilogramos, unidades y manojos se calculan exclusivamente con `registro_produccion` y `detalle_produccion`. `visitasConProduccion` representa *cantidad de visitas con estimaciones*, no cantidad cosechada.
5. Un precio introducido durante la visita es **referencial**; su multiplicación por una estimación arroja un **valor estimado**, no un ingreso ni una venta efectiva.
6. Un cultivo puede tener estimaciones de varias visitas y cosechas formales posteriores sin duplicar registros. No se suman ambas fuentes, ni se convierten automáticamente estimaciones en cosechas.

## Consulta y trazabilidad

- Visitas → Historial → Detalle: estimación por cultivo, familia y fecha. Si el cultivo tiene ciclo y el usuario tiene permiso, enlace a sus cosechas reales.
- Gestión agrícola → Ciclos → Detalle: sección «Cosechas reales» para el ciclo.
- Gestión agrícola → Producción: registros formales, búsqueda por familia o cultivo y filtro por ciclo. La consulta de pantalla está limitada a 500 registros; los futuros reportes deben usar consultas de BD completas.

## Pruebas y validación

- El servidor clasifica capturas nuevas y antiguas sin cambiar el JSON persistido ni el hash idempotente de reintentos.
- El cálculo de valorización orientativa no inventa cifras con importes o cantidades ausentes.
- El Dashboard solo suma registros de cosecha formal; las capturas de visitas no afectan esos totales.
- `npm run build`; pruebas unitarias de CIR-06, MON-04 y cálculos de visitas.

No hay cambios de esquema Prisma ni importación de datos necesarios. El informe semestral institucional continúa pendiente del módulo Reportes (CIR-11 a CIR-14).
