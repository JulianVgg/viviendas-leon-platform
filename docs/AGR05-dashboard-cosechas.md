# AGR-05 + MON-04 — Producción real en el Dashboard

## Alcance

AGR-05 ya registra cosechas en `RegistroProduccion` y `DetalleProduccion`. MON-04 ya calcula y grafica los totales de esos registros. Este ajuste agrega el desglose paginado para comprobar qué cosechas respaldan los indicadores.

- **Resumen agrícola:** mantiene ciclos, plantas y producción formal por kg / unidades sin mezclarlas con las estimaciones capturadas durante visitas.
- **Ver cosechas:** desde el encabezado de «Agricultura y producción» o la tarjeta «Registros de producción» se abre un detalle de solo lectura, con fecha, cultivo, familia, comunidad, huerto y cantidades por unidad.
- **API:** `GET /api/v1/dashboard/resumen/agricultura-produccion/cosechas?meses=6&pagina=1&limite=10&comunidadId=...`.
- **Permisos:** Dirección y Coordinación; autenticación requerida. Los técnicos no pueden consultar el detalle institucional mediante la URL.
- **Filtros:** meses (3, 6, 12) y comunidad. El filtro de responsable **no** altera producción agrícola porque los registros de cosecha no tienen un técnico responsable de ese tipo.
- **Paginación:** se ejecuta desde PostgreSQL con `count`, `skip` y `take`; no se limita a los 500 registros de la pantalla operativa de AGR-05.
- **Moneda y ventas:** no se presentan ingresos ni ventas como indicadores reales porque AGR-05 todavía no crea registros de venta en esta versión.

## Validación

1. Registrar una cosecha desde Gestión agrícola → Producción y anotar cultivo, familia, unidad y fecha.
2. Abrir Dashboard como Dirección o Coordinación, elegir el mismo período y comunidad, y pulsar «Ver cosechas».
3. Confirmar que aparece exactamente la cantidad registrada; los kg, unidades y manojos permanecen separados.
4. Cambiar de comunidad y verificar que la lista cambie de acuerdo con el filtro.
5. Entrar como técnico: la API de detalle institucional debe devolver HTTP 403.
6. Confirmar que una captura de producción de Visitas técnicas **no** aumenta las cosechas formales del Dashboard hasta que se registre en AGR-05.

### Pruebas automatizadas

```bash
npm run build -w @viviendas-leon/api
node --test apps/api/tests/agr05-dashboard-cosechas.test.mjs apps/api/tests/production-mon04.contract.test.mjs apps/api/tests/mon04-indicadores-agricolas.test.mjs apps/api/tests/mon05-filtros.test.mjs
```

No requiere migraciones ni dependencias nuevas. AI-01 no forma parte de este cambio.
