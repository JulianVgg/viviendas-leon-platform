# MON-03 — Indicadores de visitas y capacitaciones (#77)

## Alcance

- El dashboard no muestra la palabra «Período» en las tarjetas. El selector 3, 6 o 12 meses se mantiene en la cabecera.
- Las seis tarjetas del dashboard permiten abrir un listado paginado (10 por página) con información real de PostgreSQL.
- MON-03 separa visitas realizadas, programadas, vencidas y reprogramadas; y capacitaciones realizadas y programadas.
- Para Dirección y Coordinación incluye el desglose de actividad realizada por responsable y búsqueda por nombre.
- Para técnicos, todos los endpoints de visitas y capacitaciones filtran por `usuarioResponsableId` de la sesión.
- El menú «Mi calendario» es desplegable para todas las cuentas: «Calendario» dirige a la vista institucional para Dirección/Coordinación, a la vista técnica para el personal de campo y solo se muestra si el perfil tiene acceso. «Mi agenda» es la segunda opción.

## Criterios de conteo

- Una visita en estado `REALIZADA` se contabiliza como realizada, nunca como vencida.
- Una visita `PROGRAMADA` anterior a la fecha local de Guatemala se considera vencida, sin cambiar su estado en PostgreSQL.
- Las reprogramadas se cuentan una sola vez por visita con historial de reprogramación, incluso si se cambió de fecha varias veces.
- Las capacitaciones `REALIZADA` y `PROGRAMADA` se contabilizan por separado.
- El desglose por responsable suma exclusivamente actividades realizadas (visitas/capacitaciones).
- MON-03 utiliza los meses seleccionados, incluyendo hasta el último día del mes actual para mostrar también las actividades pendientes en ese mes. El dashboard base conserva su regla de fechas histórica hasta el día actual.
- Los indicadores institucionales de familias/huertos/ciclos mantienen sus criterios existentes. Las tarjetas de capacitaciones incluyen todos los registros de capacitación del período, mientras MON-03 distingue estados.

## Endpoints

- `GET /api/v1/dashboard/resumen/visitas-capacitaciones?meses=6`
- `GET /api/v1/dashboard/resumen/detalle?tipo=visitas&meses=6&pagina=1&limite=10`
- Tipos de detalle: `familias`, `huertos`, `ciclos`, `visitas`, `capacitaciones`, `vencidas`.

Los detalles institucionales de familias/huertos/ciclos requieren Dirección o Coordinación. La API valida el usuario de sesión; no acepta IDs de terceros suministrados por el frontend. Los listados se paginan desde PostgreSQL.

## Validación local

Desde la raíz del monorepo:

```bash
npm run build
node --experimental-strip-types --test apps/api/tests/mon03-indicadores.test.mjs apps/api/tests/dashboard-summary.service.test.mjs apps/api/tests/dashboard-summary.rules.test.mjs
npm run dev
```

Comprobar con una cuenta técnica y una de Dirección/Coordinación:

1. «Mi calendario» debe mostrar «Calendario» y «Mi agenda»; el destino del primer enlace cambia según el rol.
2. El dashboard no presenta etiquetas «Período» en las tarjetas.
3. Al pulsar cada tarjeta aparece un listado paginado, sin navegar a otro módulo.
4. Cambiar 3/6/12 meses actualiza valores y gráficos.
5. Un técnico nunca ve actividades de otros usuarios en las consultas y listados.
6. Las reprogramaciones múltiples cuentan una sola visita reprogramada.
7. Comparar las cifras con las tablas reales de PostgreSQL antes de cerrar #77.

No requiere migraciones ni dependencias nuevas.
