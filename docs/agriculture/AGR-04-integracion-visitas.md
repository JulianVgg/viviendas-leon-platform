# Integración entre AGR-03 y visitas técnicas: estado y próximos incrementos

## Implementado por los parches 01-03

- La siembra se registra como `CicloCultivo` desde el huerto del expediente familiar.
- La visita puede consultar ciclos activos por familia; la selección guarda un `cicloCultivoId` en la captura nueva.
- `POST /api/v1/visitas/sync` admite `cicloCultivoId` opcional, comprueba la familia y el cultivo, y
  crea `EvaluacionCultivo` en la transacción de la visita cuando el ciclo está enlazado.
- Se conserva el formato anterior `visits.create.v1`, las capturas JSONB sin ID, su hash de idempotencia
  y el flujo de reintentos offline. No se asignan automáticamente ciclos a registros históricos por nombre.
- Los ciclos consultados se cachean por usuario/familia para las visitas sin conexión.
- Cuando no existen ciclos consultables, la captura manual por nombre continúa, pero **no queda normalizada
  en `EvaluacionCultivo` y requiere conciliación posterior**.

## Pendiente (no incluido en estos parches)

1. AGR-04: normalizar plagas, enfermedades, tratamientos y evidencia en las tablas vinculadas a
   `EvaluacionCultivo`. Hoy permanecen principalmente en `visita_captura.datos`.
2. Definir una columna estructurada para `cantidadPlantasObservadas`: el valor inicial del ciclo no se
   debe sobrescribir durante una visita. Actualmente se preserva en las observaciones de evaluación.
3. AGR-05: persistir producción y ventas en `RegistroProduccion`, `DetalleProduccion` y tablas relacionadas;
   fijar unidades, periodos y deduplicación por `operationId`. Hoy producción sigue disponible en JSONB.
4. AGR-06: construir el historial familiar unificado con evaluaciones, tratamientos, cosechas y resultados.
5. Registrar ciclos offline directamente desde el expediente: las altas AGR-03 requieren conexión.
6. Validar estados, cierre de ciclos y modelo de huertos comunitarios con ViviendasLeón.

## Pruebas de integración recomendadas

- Crear familia + huerto activo + siembra y consultarlos desde el expediente y la pantalla global.
- Elegir un ciclo durante una visita REALIZADA: comprobar `visita_captura` y `evaluacion_cultivo`.
- Reenviar el mismo `operationId`: no debe duplicar visita ni evaluación.
- Probar 2 siembras del mismo tipo en el mismo huerto: la evaluación debe conservar el ID seleccionado.
- Cambiar de familia en la captura de visita: el formulario no debe reutilizar ciclos de la familia anterior.
- Probar offline, conflictos de relaciones y capturas previas sin `cicloCultivoId`.

**Advertencia:** el puente de visitas afecta un endpoint crítico de sincronización.
Revisar y probar en una base de desarrollo con la suite de VIS antes de desplegar o combinar en `main`.
