# Integración TailAdmin Pro 2.4 — Dashboard MON-01 a MON-04

## Alcance

Se utilizan las configuraciones de **ApexCharts** de los componentes incluidos en la plantilla TailAdmin React Pro 2.4 proporcionada por el equipo:

- `ActiveUsersChart` / `LineChartOne`: gráfica de área con curvas suavizadas y degradado para MON-01.
- `SessionChart`: anillo de cobertura de familias para MON-02.
- `AnalyticsBarChart`: barras con bordes redondeados para programas, comunidades, responsables y producción de MON-02 a MON-04.

Los componentes fueron adaptados en `apps/web/src/features/dashboard/charts/TailAdminCharts.tsx`; se conectan a las consultas existentes de PostgreSQL por medio de `lib/chartSeries.ts`. No usan ningún dato de demostración de TailAdmin. El backend, los permisos, los cálculos y los detalles paginados se mantienen sin cambios.

## Instalación

Desde la raíz del monorepo, **después de aplicar el parche**:

```bash
npm install
npm run build
node --experimental-strip-types --test apps/web/tests/dashboard-pro-charts.test.mjs
npm run dev
```

`npm install` instala `apexcharts` y `react-apexcharts`, declarados en `apps/web/package.json`, y actualiza `package-lock.json`. **Incluye ese archivo actualizado en el PR.** No es necesario regenerar Prisma ni aplicar migraciones.

## Comprobaciones manuales

1. Iniciar sesión con Dirección o Coordinación y consultar el dashboard.
2. Cambiar el período entre 3, 6 y 12 meses; verificar que las curvas y las barras respondan a los registros reales.
3. Seleccionar un programa; la cobertura del anillo debe mostrar el número de familias del programa seleccionado sin duplicar inscripciones en el total institucional.
4. MON-03: filtrar por responsable y comprobar que las barras separan visitas realizadas de capacitaciones.
5. MON-04: alternar kilogramos y unidades; las unidades no deben sumarse a los kilogramos.
6. Comprobar vista móvil, modo oscuro y preferencia de movimiento reducido.
7. Verificar que los indicadores y las ventanas de detalle conservan las mismas cifras y permisos.

## Límites

- Los gráficos nuevos presentan datos existentes; no crean registros de producción ni sustituyen AGR-05.
- Las tarjetas del dashboard mantienen sus ventanas de detalle.
- Las librerías están instaladas en el workspace web, no en la API.
