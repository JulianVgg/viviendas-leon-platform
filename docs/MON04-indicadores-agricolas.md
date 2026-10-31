# MON-04 — Indicadores agrícolas y producción (#78)

## Qué muestra

El dashboard institucional consulta ciclos de cultivo, cultivos asociados, cantidad **inicial** de plantas en ciclos activos, familias con siembras, producción registrada y desgloses por cultivo, comunidad y mes.

## Fuente de cada indicador

- **Ciclos, variedades y plantas:** `ciclo_cultivo`, `cultivo`, `huerto`, `familia` y `comunidad`. La cifra de plantas procede de la cantidad inicial del ciclo y **no representa plantas sobrevivientes ni producción**.
- **Producción (kg y unidades):** `registro_produccion` y `detalle_produccion`, acotados por `fecha_fin_periodo` del período seleccionado. Kg y unidades se presentan por separado y nunca se suman entre sí. Otras unidades no se convierten sin equivalencia validada.
- **Visitas con producción reportada:** `visita_captura.datos` de visitas realizadas. Se muestran **solo como conteo de visitas**, no se interpretan como cosechas definitivas. Esto evita duplicar estimaciones cuando AGR-05 registre producción estructurada.

Se utiliza `America/Guatemala` para establecer el período. Los datos del panel son institucionales: la API requiere rol de Dirección o Coordinación; el frontend no solicita estos indicadores desde cuentas técnicas. Se aplica `Cache-Control: private, no-store`.

## Validaciones

1. Iniciar sesión como Dirección/Coordinación y revisar `GET /api/v1/dashboard/resumen/agricultura-produccion?meses=6`.
2. Verificar los ciclos activos y cantidades iniciales frente a PostgreSQL.
3. Crear un registro formal de producción de prueba (si AGR-05 ya está habilitado) y comprobar que aparece en la gráfica y la unidad correcta.
4. Verificar que los datos capturados en una visita solo actualizan «Visitas con producción reportada», sin sumar cosechas inexistentes.
5. Acceder como técnico y confirmar que la API devuelve `403` para este endpoint.
6. Cambiar el período de 3, 6 o 12 meses; las cifras mensuales deben respetar la selección.
7. Volver a entrar a Dashboard; la entrada debe tener animación suave y respetar `prefers-reduced-motion`.

## Comandos

```bash
npm run build
node --test apps/api/tests/mon04-indicadores-agricolas.test.mjs apps/api/tests/mon03-indicadores.test.mjs
npm run dev
```

No requiere migraciones ni paquetes adicionales. La validación de consulta con PostgreSQL se realiza en el equipo local.
