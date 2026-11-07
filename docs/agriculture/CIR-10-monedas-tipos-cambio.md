# CIR-10 — Monedas y tipos de cambio históricos (#235)

## Qué existía antes

- `Moneda` con GTQ y USD, utilizados por `PrecioVenta`.
- Las ventas reales guardan cantidad, precio unitario y moneda original. `saleMoney` redondea a centavos con precisión decimal.
- No existía `TipoCambio` ni cálculo documentado de equivalencias históricas.

## Decisiones de diseño

1. Una tasa expresa **GTQ por 1 USD** y corresponde a **una fecha exacta**. El registro contiene fuente, referencia verificable y usuario que la capturó. No se consulta un servicio externo automáticamente.
2. Solo Dirección y usuarios con `TIPO_CAMBIO_WRITE` pueden agregar tasas. La migración concede el permiso a Coordinación agroforestal, sin otorgarlo al Técnico.
3. Las tasas se agregan, no se editan ni eliminan desde la API. La fecha es única para no cambiar silenciosamente conversiones previas. Si una tasa fue incorrecta, debe corregirse mediante procedimiento administrativo documentado, con respaldo y evidencia, antes de aprobar reportes.
4. La **moneda original no cambia**: una venta de 10 GTQ sigue siendo de 10 GTQ. La equivalencia en USD es informativa, **no otro ingreso**.
5. La fecha de la tasa debe ser **idéntica a la fecha de venta**. Si falta, la API devuelve `equivalencia: null` y `conversionPendiente: true`. Nunca aplica automáticamente la tasa de hoy a ventas antiguas.
6. El cálculo del total de la venta se realiza como antes con precisión decimal. Las conversiones se realizan sobre el importe redondeado a dos decimales, utilizando operaciones con enteros (`BigInt`) y redondeo HALF_UP al centavo.
7. Los registros históricos de cosechas y ventas no se actualizan ni requieren migraciones de datos. Solo se crea la tabla `tipo_cambio`.
8. Los listados operativos se limitan a 500 ventas y 500 tasas recientes. **CIR-11 debe consultar la base de datos completa**, y usar las mismas reglas al producir informes por semestre.

## Decisión pendiente con ViviendasLeón

Confirmar cuál será la **fuente institucional aprobada** (por ejemplo, una publicación oficial, una constancia contable o la fuente acordada por Dirección y Contabilidad), cómo se documentará cada tasa, y qué procedimiento autoriza correcciones de cotizaciones históricas. El sistema no presupone que una fuente esté aprobada ni valida automáticamente el contenido de una referencia escrita.

## API

- `GET /api/v1/producciones/ventas/tipos-cambio`: tasas registradas (lectura con permisos de producción).
- `POST /api/v1/producciones/ventas/tipos-cambio`: crea una tasa (solo `TIPO_CAMBIO_WRITE` o Dirección).

Ejemplo de JSON de solicitud **ficticia para pruebas**, no cotización real:

```json
{
  "fecha": "2026-11-05",
  "quetzalesPorDolar": "7.750000",
  "fuente": "Fuente de prueba",
  "referencia": "Documento interno ficticio"
}
```

`GET /api/v1/producciones/ventas` mantiene `totalVenta` y `moneda` originales y agrega:

- `equivalencia: { tipoCambioId, totalGTQ, totalUSD, fechaTasa, quetzalesPorDolar, fuente, referencia }` cuando hay tasa válida para la fecha exacta.
- `equivalencia: null` y `conversionPendiente: true` cuando falta una tasa para GTQ/USD.

`POST /ventas` mantiene la estructura original y no exige tipo de cambio para registrar una venta real.

## Aplicación y verificación

Desde la raíz del monorepo, con respaldo comprobado de PostgreSQL:

```sh
cd apps/api
npx prisma migrate deploy --config prisma7.config.ts
npx prisma generate --config prisma7.config.ts
cd ../..
npm run build
node --experimental-strip-types --test apps/api/tests/cir10-tipo-cambio.test.mjs
node --test apps/api/tests/cir09-ventas.test.mjs
```

Verificar manualmente desde **Gestión agrícola → Producción → Tipos de cambio**:

1. Dirección o Coordinación puede registrar una tasa documentada para una fecha pasada; un técnico no puede crear tasas (403), aunque pueda consultar las que existan.
2. Intentar guardar dos tasas para la misma fecha devuelve 409; introducir fecha futura, tasa negativa o referencia vacía devuelve 400.
3. Una venta en USD o GTQ con tasa correspondiente a su fecha muestra original y equivalencia, fecha y fuente.
4. Una venta sin tasa de su fecha mantiene el total original y muestra "Sin tasa verificada". Registrar una tasa de otra fecha no cambia ese estado.
5. Las visitas técnicas y las cosechas no se modifican; los precios de referencia nunca se suman como ingresos reales.

**No registrar cotizaciones de ejemplo en la base de datos institucional.**
