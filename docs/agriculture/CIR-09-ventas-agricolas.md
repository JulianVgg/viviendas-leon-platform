# CIR-09 — Ventas y precios agrícolas (issue #234)

## Alcance

- **Producción real**: permanece en `RegistroProduccion` y `DetalleProduccion`, con cantidades y unidades originales.
- **Venta real**: utiliza `RegistroVenta` con fecha, cantidad y unidad y un `PrecioVenta` por moneda elegida.
- **Precio de referencia**: los cálculos orientativos de las visitas técnicas no generan ingresos ni ventas.
- **Importe**: cantidad vendida × precio unitario; se calcula en el backend con precisión decimal y se expresa con dos decimales en la moneda original. No se convierte GTQ/USD (CIR-10).

## Reglas

1. La venta requiere una cosecha existente y una unidad idéntica a una de sus unidades registradas. No se convierten kg a piezas o manojos.
2. La cantidad vendida debe ser positiva, respetar hasta tres decimales para kg y ser entera en unidades/manojos.
3. El total vendido por cosecha y unidad no puede superar la cantidad cosechada (se valida bajo transacción serializable, conflicto de concurrencia = HTTP 409).
4. Fecha válida no futura y no anterior al inicio del período de producción; la moneda debe estar activa y ser oficial (GTQ/USD u otra moneda real configurada).
5. Una venta nueva registra **un solo precio unitario y una sola moneda**. No inventar tipo de cambio ni considerar otra divisa como ingreso adicional.
6. API: `GET /api/v1/producciones/ventas`, `GET /api/v1/producciones/ventas/monedas`, `GET /api/v1/producciones/ventas/disponibilidad?registroProduccionId=N`, `POST /api/v1/producciones/ventas`.
7. Lectura requiere `PANTALLA_PRODUCCION` y escritura `PRODUCCION_WRITE`; toda alta queda en bitácora. No hay edición o borrado de ventas en CIR-09.
8. Listados operativos se limitan a 500 registros; **CIR-11 deberá consultar directamente la base** sin truncar semestres ni mezclar moneda/unidades.

## Activar monedas para ventas

Desde `apps/api`, con PostgreSQL de desarrollo y respaldo verificado:

```text
node scripts/cir-09-habilitar-monedas.mjs
node scripts/cir-09-habilitar-monedas.mjs --aplicar --respaldo-confirmado --confirmar CODIGO --usuario-correo CORREO_AUTORIZADO
node scripts/cir-09-habilitar-monedas.mjs
```

El primer comando simula; el segundo crea GTQ/USD si faltan y solo después de confirmar el código. El tercero debe indicar `EXISTE` para ambas. Nunca incluir datos personales, secretos o respaldos en el commit.

## Pruebas de aceptación

- `npm run build` y `node --test apps/api/tests/cir09-ventas.test.mjs` pasan.
- Con una cosecha real de 10 kg, registrar 4 kg y luego 6 kg deja saldo 0; intentar vender 1 kg adicional devuelve HTTP 409.
- Una venta por piezas/manojos no acepta decimales y las unidades diferentes no se convierten.
- Una venta a Q 10.50 con cantidad 2 genera Q 21.00; si se elige USD, el total sigue en USD sin conversión automática.
- Un precio estimado en una visita **no** agrega fila a `RegistroVenta`.
- Dirección y usuarios autorizados pueden registrar; otro usuario autenticado sin `PRODUCCION_WRITE` recibe 403.
- Los registros de prueba existentes se identifican como tales y no deben mezclarse con los reportes institucionales.

## Pendiente para CIR-10 y CIR-11

Tipos de cambio históricos, reportes semestrales sin límite de resultados y trazabilidad de tasas aplicadas. Confirmar con la ONG si las ventas se deben imputar por fecha de cosecha o fecha de venta para el semestre.
