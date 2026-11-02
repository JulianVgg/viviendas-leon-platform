# MON-05 — Filtrar indicadores (#79)

## Alcance

Se conserva el período de **3, 6 o 12 meses** y se incorporan filtros institucionales:

- **Comunidad:** limita familias, huertos, ciclos, producción, visitas, capacitaciones y los listados que sustentan las tarjetas.
- **Responsable:** limita **visitas y capacitaciones**. No se modifica el número de familias, huertos ni la cosecha institucional por seleccionar un técnico.
- **Limpiar:** restablece el período a 6 meses, todas las comunidades y todos los responsables.
- **Actualizar:** vuelve a consultar la API con los filtros elegidos.
- **Programa:** el selector local de MON-02 se mantiene y opera sobre las familias de la comunidad elegida.

Las cifras y gráficos se consultan desde PostgreSQL. Los detalles paginados reciben exactamente la comunidad y el responsable de la tarjeta.

## Acceso

Dirección y Coordinación pueden obtener opciones de comunidades y responsables mediante `GET /api/v1/dashboard/resumen/filtros`.

En cuentas técnicas se mantiene únicamente el selector del período. La API rechaza los filtros institucionales con **HTTP 403** si un usuario operativo los envía manualmente; también mantiene el filtro de `usuarioResponsableId` de la sesión.

Identificadores inválidos (no enteros positivos, arreglos o inyección textual) reciben **HTTP 400**.

## API

Los endpoints existentes admiten los parámetros opcionales `comunidadId` y `responsableId` según su alcance:

- `GET /api/v1/dashboard/resumen?meses=6&comunidadId=12&responsableId=7`
- `GET /api/v1/dashboard/resumen/detalle?tipo=visitas&meses=6&pagina=1&limite=10&comunidadId=12&responsableId=7`
- `GET /api/v1/dashboard/resumen/visitas-capacitaciones?meses=6&comunidadId=12&responsableId=7`
- `GET /api/v1/dashboard/resumen/familias-programas?comunidadId=12`
- `GET /api/v1/dashboard/resumen/agricultura-produccion?meses=6&comunidadId=12`

**Nota:** para familias y agricultura el filtro de responsable no tiene efecto, porque no existe un único técnico propietario de esos registros. La cifra de visitas con producción reportada en MON-04 también se mantiene institucional dentro de la comunidad seleccionada.

## Verificación antes del PR

1. Iniciar sesión como Dirección y elegir una comunidad: comprobar que cambian las tarjetas, las gráficas de programas, la producción y los detalles paginados.
2. Seleccionar un responsable: comprobar que cambian sus visitas, capacitaciones y la actividad mensual, pero **no** el total de familias ni producción.
3. Cambiar el período de 6 a 3 meses: comprobar visitas, capacitaciones y producción mensual.
4. Abrir una tarjeta y contrastar el listado y su total con el indicador correspondiente.
5. Pulsar **Limpiar**: verificar los tres filtros restablecidos.
6. Iniciar sesión como técnico: comprobar que solo ve sus indicadores, el período y no tiene el catálogo de responsables.
7. Probar filtros institucionales manuales con la sesión técnica: respuesta HTTP 403.

### Comandos

```bash
npm run build
node --experimental-strip-types --test apps/api/tests/mon05-filtros.test.mjs apps/api/tests/mon03-indicadores.test.mjs apps/api/tests/dashboard-summary.service.test.mjs apps/api/tests/families-programs.rules.test.mjs apps/api/tests/mon04-indicadores-agricolas.test.mjs apps/web/tests/dashboard-filters.test.mjs
npm run dev
```

No se añaden migraciones ni dependencias nuevas. El parche presupone MON-04 y la integración previa de ApexCharts de TailAdmin Pro.
