# CIR-09/CIR-10 — Registro en visitas y consulta por ciclo

## Flujo operativo

1. El técnico entra en **Visitas técnicas → Registrar visita → Evaluación de cultivos**.
2. En un ciclo relacionado con esa familia abre **Producción agrícola**. La **estimación** es opcional y no representa ingresos reales.
3. Si corresponde, activa **Registrar cosecha o venta real** dentro del mismo bloque.
   - Puede registrar una cosecha y, opcionalmente, una venta de esa cosecha.
   - También puede seleccionar una cosecha anterior con saldo para registrar una venta nueva.
4. Guarda la visita. El servidor valida unidad, fecha, moneda, disponibilidad y permisos y confirma los movimientos en la misma transacción. En modo offline permanecen pendientes hasta sincronizarse.
5. Desde **Ciclos agrícolas → Seguimiento**, la sección **Cosechas reales** muestra las ventas asociadas a cada cosecha, con fecha, cantidad, moneda, precio, total y visita de origen si la tiene.

En **Gestión agrícola → Producción** se conserva la consulta y registro de cosechas. Se retiran los paneles de **Ventas agrícolas** y **Tipos de cambio**; el registro visible de ventas queda concentrado en Visitas.

## Tipos de cambio

El backend conserva las tasas históricas de CIR-10. Cuando se consulta una venta sin tasa almacenada, intenta obtener la tasa de referencia para la fecha de esa venta mediante el Web Service `TipoCambioRango` del Banco de Guatemala. Si el proveedor no responde o no publica una tasa de la fecha exacta, la equivalencia se mantiene pendiente: el importe original no cambia. La fuente de la tasa se conserva en PostgreSQL. El servicio web tiene carácter informativo; antes de usar las conversiones para estados financieros oficiales se debe validar el criterio contable con ViviendasLeón.

## Validación manual

- Comprobar que Producción muestre cosechas, sin paneles de ventas o tasa manual.
- Registrar una visita de prueba sobre un ciclo activo y guardar una cosecha con venta parcial.
- Entrar en el seguimiento del mismo ciclo; verificar la cosecha y la venta con igual cantidad, precio, fecha y moneda.
- Registrar una nueva visita con una venta de una cosecha anterior y verificar que no exceda el saldo.
- Comprobar que una estimación sin movimiento real no cree ninguna venta ni altere los totales cosechados.
- Confirmar que al reintentar una operación sincronizada no se dupliquen sus cosechas o ventas.
- Comprobar permisos con el usuario técnico y con un usuario sin `PRODUCCION_WRITE`.
- Comprobar que la ausencia del servicio externo no impida consultar los importes originales.
