# CIR-01 — Reglas de información agrícola y consolidación institucional

**Issue:** #226 — CIR-01
**Épica:** Validaciones / consolidación de información y reportes
**Organización:** ViviendasLeón Guatemala
**Estado del documento:** Propuesta para validación; **no constituye aprobación de la ONG**
**Fecha:** 04/11/2026

## 1. Objetivo

Definir las reglas de negocio para registrar e interpretar la información agrícola, distinguir estimaciones, cosechas y ventas, y establecer criterios de cálculo que permitan construir reportes semestrales verificables, sin alterar la información histórica.

Este issue es **documental**: no incluye migraciones, nuevas pantallas, modificación de fórmulas ni carga de datos. Las implementaciones se abordarán en los subissues posteriores de la épica.

## 2. Fuentes revisadas

1. Documento proporcionado por ViviendasLeón, «Documento sin título (5).pdf», pp. 1–4: participantes, variedades, formato de producciones agrícolas y soporte técnico.
2. Informe institucional **PRODUCCIONES AGRÍCOLAS — JULIO–DICIEMBRE 2025**: 20 filas de cultivos; el encabezado identifica un proyecto de 18 huertos familiares.
3. `docs/sprints/sprint-1/requerimientos/reglas-negocio-alcance-definitivo.md`: RN-001 a RN-005, RN-012 a RN-017 y RN-038 a RN-041.
4. `docs/analisis_proceso_actual.md`: registro de información y preparación manual de reportes.
5. `apps/api/prisma/schema.prisma`: `CicloCultivo`, `RegistroProduccion`, `DetalleProduccion`, `RegistroVenta`, `PrecioVenta`, `UnidadMedida` y `Moneda`.
6. `apps/api/src/modules/agriculture/production.routes.ts`: registro de cosechas formales.
7. `apps/web/src/features/visits/services/visitProduction.ts`: cálculos orientativos en visitas.
8. `apps/api/src/modules/dashboard/agriculture-production.rules.ts` y `docs/AGR05-dashboard-cosechas.md`: consolidación de cosechas por unidad y separación entre datos de visitas y registros reales.

### 2.1 Columnas del reporte de referencia

Número, cultivos, cantidad de plantas, producto obtenido por planta (unidad), producto obtenido por planta (kg), total de producción obtenida (unidades), total de producción obtenida (kg), precio de venta (Q), precio de venta ($), total de venta (Q), total de venta ($) y observaciones.

**Importante:** el título «Total de venta» del archivo original no permite determinar, por sí solo, si se trata de ventas efectivamente realizadas o de una valorización de la cosecha completa. Este punto requiere confirmación institucional.

## 3. Glosario operativo

| Término | Definición de trabajo | Estado |
|---|---|---|
| Familia beneficiaria | Unidad asociada a huertos, visitas y participación en programas. | Compatible con el modelo actual |
| Huerto | Unidad de producción relacionada con una familia. | Compatible con el modelo actual |
| Ciclo de cultivo | Cultivo establecido en un huerto, con fechas y cantidad de plantas según la información registrada. | Compatible con el modelo actual |
| Plantas establecidas | Número de plantas sembradas o trasplantadas al inicio de un ciclo. | Definición propuesta |
| Plantas productivas | Número de plantas que efectivamente aportaron producción durante el período de referencia. | **Por confirmar y modelar** |
| Producción estimada | Resultado proyectado a partir de plantas y rendimientos por planta; no representa cosecha comprobada. | Ya diferenciada en el cálculo de visitas |
| Producción real / cosechada | Cantidad obtenida y registrada como cosecha, asociada a un ciclo y a una unidad. | Implementada en producción formal |
| Producción vendida | Parte de la cosecha comercializada y documentada mediante registros de venta. | Modelo previsto; flujo pendiente |
| Precio de referencia | Precio utilizado para valorizar producción, sin acreditar una transacción. | Requiere definición institucional |
| Venta real | Operación de comercialización con cantidad, unidad, precio, moneda y fecha. | Propuesta para flujo pendiente |
| Valorización estimada | Cálculo económico hipotético de producción; **no equivale a ingresos efectivamente recibidos**. | Regla propuesta |
| Tipo de cambio aplicado | Relación Q/USD documentada para una conversión monetaria. | **Por confirmar** |

## 4. Reglas de negocio propuestas para CIR-01

Las reglas siguientes ordenan la interpretación de datos. Las que dependen de decisiones de la organización se marcan **pendientes de validación**. No reemplazan las reglas RN ya existentes.

### RA-01 — Origen y trazabilidad de los datos

Toda cifra del reporte deberá derivar de registros de la plataforma o de una fuente externa identificada y conciliada. Un dato pendiente no se reemplazará silenciosamente por cero. **Base:** RN-005 y RN-038.

### RA-02 — Separación entre estimación, cosecha y venta

Se conservarán como conceptos distintos: (a) producción estimada durante una visita, (b) cosecha registrada formalmente y (c) cantidad vendida. Un cálculo de visita no generará una cosecha ni una venta automáticamente. **Base:** comportamiento actual de `visitProduction.ts`, `production.routes.ts` y `AGR05-dashboard-cosechas.md`.

### RA-03 — Asociación agrícola válida

Cada cosecha formal estará asociada con un ciclo de cultivo existente, que permita identificar cultivo, huerto y familia. La asociación con personas, comunidades y fechas deberá mantenerse al consolidar datos. **Base:** RN-002, RN-012 a RN-015.

### RA-04 — Cantidad de plantas

Se mantendrá separada la cantidad de plantas establecidas de la cantidad de plantas productivas. El valor actual de `CicloCultivo.cantidadPlantas` **no se interpretará automáticamente** como número histórico de plantas productivas de un semestre. **Pendiente:** confirmar la definición usada por la ONG y la forma de registrar bajas/reemplazos.

### RA-05 — Producción estimada en unidades

Si existen `plantas` y `unidades estimadas por planta` confiables para el mismo contexto:

`unidades_estimadas = plantas × unidades_estimadas_por_planta`.

El resultado se etiquetará **estimado**. No se presentará como cosecha real.

### RA-06 — Producción estimada en kilogramos

Si existen `plantas` y `kg estimados por planta` confiables para el mismo contexto:

`kg_estimados = plantas × kg_estimados_por_planta`.

La estimación de kg no se deducirá de las unidades mediante un peso promedio inventado.

### RA-07 — Producción real

Para cada cultivo y semestre, la producción real será la suma de los detalles de cosechas válidas dentro del período, **agrupados por la misma unidad de medida**:

`produccion_real(cultivo, unidad, semestre) = suma(cantidad_total de cada cosecha elegible)`.

Si una misma cosecha dispone de cantidades en unidades y kg, ambas pueden describir el mismo producto: no representan dos cosechas independientes y no se sumarán entre sí.

### RA-08 — Producción real por planta

Solo podrá calcularse como `produccion_real / plantas_productivas` si la ONG confirma el denominador, su período y la metodología. Si no existe un valor válido de plantas productivas, el indicador aparecerá como **no disponible**, no como cero. **Pendiente de validación.**

### RA-09 — Unidades incompatibles

Kilogramos, unidades, manojos y otras medidas se conservarán por separado. Se permitirá convertir únicamente con equivalencias expresamente definidas y verificables. **Base:** RN-016 y reglas existentes del Dashboard.

### RA-10 — Precio y base de cobro

Todo precio deberá identificar la moneda y la unidad a la que aplica, por ejemplo `Q/kg`, `Q/unidad` o `Q/manojo`. No se multiplicará un precio por kilogramos si corresponde a manojos. **Pendiente:** confirmar la base de precio para cada cultivo del formato histórico.

### RA-11 — Cálculo de ventas reales

Una vez implementado el flujo correspondiente, el importe de una operación documentada será:

`importe_venta = cantidad_vendida_en_su_unidad × precio_por_esa_unidad`.

El total semestral de **ventas reales** será la suma de operaciones reales elegibles del período; nunca la suma de importes estimados. Se deberá decidir también cómo tratar devoluciones, correcciones o anulaciones. **Pendiente de validación.**

### RA-12 — Valorización de producción

Si la ONG requiere calcular el valor comercial aproximado de toda la cosecha, se generará un concepto separado: `valor_estimado = produccion_elegible × precio_referencia`. La salida deberá identificarlo como valorización y no como dinero recibido. **Pendiente de confirmación institucional.**

### RA-13 — Monedas y conversión

Los totales Q y USD mantendrán su origen y la tasa, fecha y criterio de conversión, cuando corresponda. No se inferirá un tipo de cambio desde importes redondeados del Excel histórico. Si el valor fue registrado originalmente en una moneda, la conversión no deberá contar como una segunda venta. **Pendiente:** fuente oficial y política de tasa.

### RA-14 — Semestres institucionales

Los períodos a presentar serán `01/01–30/06` y `01/07–31/12` del año seleccionado, con ambos extremos incluidos. Las cosechas puntuales actuales usan la misma fecha de inicio y fin. Para registros que abarquen dos semestres, se deberá confirmar una regla de imputación antes de consolidarlos. **Pendiente parcial.**

### RA-15 — Período de una venta

Cuando existan ventas, el semestre de comercialización se determinará por la **fecha de venta documentada**, sin sustituirla por la fecha de cosecha. La inclusión de ventas sin fecha requiere una política expresa. **Regla propuesta, pendiente de validación.**

### RA-16 — Registros incompletos

Una cantidad desconocida, precio ausente o factor de conversión no verificado no podrá sustituirse por cero ni completarse con promedios automáticos. El reporte deberá señalar las limitaciones de los datos.

### RA-17 — Duplicidades

Los registros de cosecha repetidos, reintentos de sincronización y estimaciones procedentes de visitas no podrán inflar los totales. Los criterios técnicos para detectar duplicados se desarrollarán en los issues de implementación. **Base:** RN-004 y RN-036.

### RA-18 — Granularidad y presentación

El resumen institucional conservará una fila por cultivo y período, como el formato original, mientras el detalle verificable deberá permitir consultar las cosechas de cada familia/huerto/ciclo. Un resumen no sustituye los registros que lo respaldan. **Regla propuesta.**

### RA-19 — Precisión y redondeos

Las cantidades se almacenarán y calcularán con precisión decimal, respetando la unidad; las cifras monetarias mostradas se redondearán a dos decimales. El criterio exacto de redondeo por operación frente a total acumulado deberá documentarse al implementar ventas y exportación. **Pendiente parcial.**

### RA-20 — Conservación de registros

Las correcciones de datos históricos deberán conservar evidencia de su origen y evitar pérdidas de trazabilidad. No se sobrescribirán resultados aprobados sin un mecanismo de revisión. **Base:** RN-001, RN-005 y RN-048 a RN-050.

## 5. Ejemplos de interpretación (no equivalen a aprobación del formato)

**Estimación:** 100 plantas × 2 kg proyectados por planta = **200 kg estimados**. No es una cosecha real.

**Cosechas:** un ciclo registra una cosecha de 35 kg y otra de 40 kg en el mismo semestre; el total real será **75 kg**, siempre que ambas sean válidas y no duplicadas.

**Valorización:** 75 kg reales × Q10/kg de precio de referencia = **Q750 de valorización**; no se declarará como ingreso cobrado.

**Venta efectiva:** se venden 25 kg a Q10/kg con fecha y registro de venta; el importe real documentado será **Q250**. Los restantes 50 kg no son automáticamente ventas.

**Unidades:** 40 manojos y 15 kg no pueden sumarse como si fueran 55 kg; deberán mantenerse separados o utilizar una conversión validada.

## 6. Decisiones pendientes de confirmación con ViviendasLeón

| ID | Pregunta para Coordinación / Dirección | Impacto si no se resuelve | Subissues relacionados |
|---|---|---|---|
| DV-01 | En el Excel 2025, ¿«Total de venta» representa ventas efectivas o el valor estimado de toda la producción? | Definición de ingresos y reportes | CIR-09, CIR-11, CIR-12 |
| DV-02 | ¿«Cantidad de plantas» corresponde a sembradas, sobrevivientes/productivas o a un conteo tomado al cierre del semestre? | Denominador de rendimiento | CIR-04, CIR-05, CIR-11 |
| DV-03 | ¿Los valores «por planta» son mediciones reales, promedios o estimaciones técnicas? | Clasificación de producción | CIR-05, CIR-06, CIR-11 |
| DV-04 | Para cada cultivo, ¿el precio corresponde a kg, unidad, manojo u otra presentación? | Cálculos económicos correctos | CIR-05, CIR-09, CIR-11 |
| DV-05 | ¿Cómo se elige el precio de referencia y cada cuánto se actualiza? | Valorización reproducible | CIR-09, CIR-11 |
| DV-06 | ¿Qué tipo de cambio Q/USD se aplica y de qué fecha/fuente proviene? | Totales en USD | CIR-10, CIR-12 |
| DV-07 | ¿Qué tratamiento debe darse a una cosecha o venta que cubra o cruce dos semestres? | Criterio temporal | CIR-11 |
| DV-08 | ¿Por qué el informe habla de 18 huertos y el listado oficial incluye 19 participantes? | Cobertura del informe | CIR-02 |
| DV-09 | ¿Las 20 filas del Excel son todos los cultivos reportables o solo los que produjeron ese semestre, respecto de las 22 variedades listadas? | Filas y datos faltantes | CIR-03, CIR-12 |
| DV-10 | ¿Qué hacer con producción destinada a autoconsumo, donación o pérdida y con devoluciones/anulaciones de ventas? | Diferencia producción vs. ingresos | CIR-09, CIR-11 |
| DV-11 | ¿Quién revisa y quién aprueba el reporte antes de enviarlo, y qué cambios son permitidos después? | Gobernanza de informes | CIR-15 |

**Responsables sugeridos para validación:** Yamileth (coordinación agroforestal), Yohan (criterios técnicos de cosecha) y Maybeline (forma de reportar a Dirección). Las asignaciones deben confirmarse con el equipo.

## 7. Correspondencia con el estado del software

| Elemento | Evidencia revisada | Resultado para CIR-01 |
|---|---|---|
| Estimación de visitas | `visitProduction.ts` | Ya está diferenciada explícitamente de cosechas y ventas reales. |
| Cosecha formal | `production.routes.ts` + `RegistroProduccion` y `DetalleProduccion` | Registra fecha, ciclo, cantidad y unidad. |
| Dashboard agrícola | `agriculture-production.rules.ts` | Agrupa kg/unidades y no mezcla unidades incompatibles; no equivale al informe semestral. |
| Ventas | `RegistroVenta` y `PrecioVenta` en Prisma | Estructura de datos existente; falta flujo operativo de captura. |
| Reporte semestral | Formato proporcionado por ONG | Pendiente de implementación en CIR-11 a CIR-14. |
| Conteo de plantas productivas | `CicloCultivo.cantidadPlantas` | No basta por sí solo para acreditar el conteo histórico de plantas productivas. |

## 8. Trazabilidad hacia la épica

- **CIR-02:** conciliación de participantes y huertos.
- **CIR-03:** catálogo de cultivos del documento institucional.
- **CIR-04 a CIR-06:** relaciones, unidades y distinción entre estimaciones y cosechas.
- **CIR-09 y CIR-10:** ventas, precios, monedas y tasa de cambio.
- **CIR-11 a CIR-14:** agregación semestral, exportación Excel e interfaz.
- **CIR-15 y CIR-20:** aprobación, permisos y validaciones funcionales.
- **CIR-21:** actualización de los demás documentos una vez confirmadas las decisiones.

## 9. Evidencia y criterios de cierre de CIR-01

- [x] Revisado el formato institucional de producciones agrícolas.
- [x] Definidas y separadas producción estimada, cosecha real y venta real.
- [x] Documentado el criterio propuesto para plantas establecidas y productivas.
- [x] Documentados cálculos, unidades, períodos y límites de interpretación.
- [x] Identificadas las decisiones pendientes de confirmación institucional.
- [ ] Confirmadas por Coordinación las definiciones y decisiones que afectan al reporte.
- [ ] Registrada la aprobación del documento (fecha, responsable y decisiones acordadas).

**Condición para cerrar el issue:** el documento puede someterse a revisión técnica ahora, pero no debe marcarse como **aprobado por la ONG** sin respuesta formal de Coordinación. Las preguntas sin resolver deben mantenerse identificadas y los issues dependientes no deben asumirlas como hechos.

## 10. Registro de aprobación (pendiente)

| Fecha | Persona / rol | Decisiones confirmadas | Evidencia o referencia |
|---|---|---|---|
| Pendiente | Coordinación / Dirección | Pendiente | Pendiente |
