# Ajustes de experiencia — Visitas técnicas

## Alcance

- Paso 2: una acción «Añadir hallazgo» para plagas o enfermedades; dos entradas de rendimiento por planta; totales y ventas **estimados** calculados según plantas observadas.
- AGR-04: mantener `cicloCultivoId`, `observacionesCultivo` y su sincronización. Cambiar de ciclo reinicia los valores de la evaluación previa en el formulario.
- Paso 3: compromisos editables por tarjeta, seguidos de observaciones técnicas y evidencia fotográfica. La captura no muestra controles de grabación inactivos ni formularios de recomendaciones/insumos. Se conservan las propiedades `recommendation` y `treatment` vacías para compatibilidad con la API existente.
- Roles: Dirección y Coordinación pueden consultar y reprogramar según sus permisos, pero no crear capturas técnicas ni subir evidencia mediante la API; se ocultan los accesos a Registrar visita.
- Historial: búsqueda, estado, rango de fechas y paginación (10, 20, 50 filas) sobre los registros cargados.

## Cálculos de producción

- Unidades estimadas = plantas observadas × unidades por planta.
- Kilogramos estimados = plantas observadas × kg por planta.
- Venta estimada (Q) = unidades estimadas × Q/unidad, o kg estimados × Q/kg según la base seleccionada.
- Si falta plantas observadas o rendimiento para la base elegida, no se muestra una estimación de venta.
- Estos campos son **estimaciones**, no cantidades reales cosechadas o vendidas. AGR-05 deberá manejar la producción y ventas reales.

## Limitación de historial

El endpoint existente `/api/v1/visitas` devuelve hasta 300 registros. Esta mejora incorpora paginación de interfaz sobre los datos cargados; para consultar todo el historial acumulado a largo plazo se deberá implementar paginación, búsqueda y filtros en PostgreSQL, preservando la conciliación de operaciones offline.

## Validación local

1. Ejecutar `npm run build` y `node --experimental-strip-types --test apps/web/tests/visit-production.test.mjs`.
2. Probar el paso 2 con dos ciclos y cambiar uno: no deben permanecer observaciones, plagas ni valores del ciclo anterior.
3. Probar los cálculos de unidad, kg y Q con `Plantas observadas = 3`, `Planta (unidades) = 4`, `Precio por unidad = Q5`; el total estimado debe ser Q60.
4. En el paso 3 crear dos compromisos; guardar y confirmar que los registros históricos anteriores no cambian.
5. Iniciar sesión como Dirección y Coordinación: «Registrar visita» no debe estar disponible, y POST `/api/v1/visitas/sync` debe devolver 403.
6. Iniciar sesión como técnico: registrar una visita en línea y otra offline y verificar sincronización sin duplicados.
7. En Historial probar búsqueda, rango de fechas, filtros de estado y paginación, especialmente en móvil.

## Transcripción de voz — decisión pendiente

No se ha habilitado reconocimiento automático de voz en este cambio. Se retiraron botones de grabación inactivos. Alternativas a valorar:

- **Web Speech API** como prototipo rápido solo en navegadores compatibles, no fiable para un requisito offline y con posibles transferencias a servicios de reconocimiento del navegador.
- **MediaRecorder + transcripción API** desde un endpoint seguro del backend, con límites, consentimiento para grabación y revisión manual del texto obtenido. Nunca exponer una API key en el frontend.
- **Motor local/autogestionado** en servidor o dispositivo (p. ej. whisper.cpp) si se prioriza soberanía del dato y procesamiento sin terceros. En móviles offline implica capacidad y soporte adicionales.

En cualquier opción, no guardar audio por defecto ni utilizar automáticamente la transcripción como registro definitivo sin confirmación del técnico.
