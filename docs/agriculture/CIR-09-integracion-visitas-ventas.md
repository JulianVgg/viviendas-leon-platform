# CIR-09 — Integración de cosechas y ventas con visitas técnicas

## Alcance

- La **producción estimada** sigue siendo un dato de evaluación y nunca crea automáticamente una cosecha.
- Dentro del **paso 2** de una visita REALIZADA se puede registrar una cosecha nueva y, opcionalmente, una venta de esa cosecha.
- También puede registrarse una venta de una **cosecha previamente registrada**, seleccionándola en la misma visita.
- Las ventas usan `RegistroVenta`/`PrecioVenta`; las cosechas usan `RegistroProduccion`/`DetalleProduccion`. Ambos pueden apuntar a la visita por `visita_origen_id` (opcional, para preservar históricos).
- Los movimientos se guardan **en la misma transacción que la visita**. Una visita offline con movimientos pendientes **no se contabiliza** hasta recibir confirmación del servidor.
- Los reintentos de la operación utilizan el mismo `operationId` para impedir la doble contabilización. La comprobación del saldo se repite en el servidor con aislamiento SERIALIZABLE.

## Permisos

- Un técnico necesita `VISITAS_WRITE` para registrar la visita y `PRODUCCION_WRITE` para capturar cosechas/ventas dentro de ella. Dirección puede consultar según los permisos actuales de la aplicación, pero no registra visitas técnicas.
- Las consultas de catálogos, cosechas y saldos aceptan `PANTALLA_PRODUCCION` o `PRODUCCION_WRITE`.
- En dispositivos sin conexión solo es posible iniciar una nueva cosecha/venta cuando los catálogos de unidades y monedas ya fueron consultados previamente. Las ventas de cosechas anteriores requieren una consulta de saldo en línea para seleccionarse.

## Reglas

1. Se exige una siembra activa y asignada a la familia de la visita. Las evaluaciones manuales no relacionadas no generan cosechas reales.
2. Las fechas de cosecha y venta no pueden ser posteriores a la fecha de la visita. La venta tampoco puede anteceder a la cosecha.
3. La unidad vendida debe coincidir con una unidad de cosecha; no hay conversiones automáticas entre kg, piezas y manojos.
4. Se rechazan cantidades no positivas, cantidades fraccionarias de unidades/manojos, precios no válidos y ventas que excedan el saldo real.
5. Si el servidor rechaza un movimiento, la **visita completa permanece pendiente de sincronización** (no se guarda una venta parcialmente).
6. No se atribuyen ventas históricas a una visita si originalmente no tenían dicha asociación.

## Prueba manual de aceptación

1. Iniciar sesión con un técnico que tenga `VISITAS_WRITE`, `PANTALLA_CICLOS` y `PRODUCCION_WRITE`.
2. Seleccionar una familia con un ciclo activo, fechas de siembra/trasplante compatibles con la fecha de cosecha.
3. Paso 2 → elegir la siembra → **Cosecha y venta reales** → registrar cosecha nueva y venta parcial.
4. Guardar la visita. Si se sincroniza, abrir **Producción** y verificar una cosecha y una venta con la misma referencia de visita.
5. Probar offline con los catálogos previamente cargados: debe permanecer pendiente hasta la sincronización, sin contar venta antes del acuse.
6. Reintentar el mismo envío y comprobar que no se dupliquen los importes.
7. Intentar vender más que la cosecha: el backend debe rechazar el movimiento sin guardar parte del registro.
8. Confirmar que añadir únicamente una **estimación** no modifica las cosechas ni las ventas reales.

> Esta integración requiere migración de Prisma y regeneración del cliente antes de compilar la API.
