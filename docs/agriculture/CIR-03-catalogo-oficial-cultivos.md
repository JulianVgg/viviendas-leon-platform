# CIR-03 — Catálogo oficial de cultivos

**Issue:** #228 · **Fuente:** información institucional proporcionada por ViviendasLeón Guatemala (listado de variedades en la página 3 del documento).

## Variedades oficiales (22)

1. Tomate
2. Chile pimiento
3. Chile jalapeño
4. Pepino
5. Brócoli
6. Coliflor
7. Cebolla
8. Repollo
9. Rábano
10. Cilantro
11. Apio
12. Zanahoria
13. Remolacha
14. Flor de muerto
15. Ruda
16. Albahaca
17. Manzanilla
18. Frijol
19. Hierba mora
20. Acelga
21. Espinaca
22. Lechuga

## Reglas de conciliación

- Se consideran equivalentes únicamente las variaciones ortográficas de tildes, mayúsculas, espacios y guiones.
- `Frijol` y `Frijol bolonillo` **no se fusionan**: la segunda denominación puede referirse a una variedad específica y requiere confirmación de la ONG.
- El importador no elimina cultivos existentes ni cambia el identificador de cultivos vinculados con ciclos agrícolas, visitas o producción.
- Un cultivo existente inactivo debe revisarse desde el catálogo antes de habilitarlo para nuevas siembras. Las colisiones ortográficas múltiples requieren conciliación manual.
- Los cultivos sintéticos del seed no se eliminan automáticamente. Debe revisarse su uso antes de desactivarlos.
- Las variedades pueden ampliarse desde **Administración → Catálogo de cultivos**, sin nuevas modificaciones al código fuente.
- Las evaluaciones manuales de visitas consumen el catálogo de cultivos activos desde `/api/v1/cultivos/disponibles` y usan el almacenamiento local únicamente como respaldo autorizado durante fallas de conexión.

## Aplicación controlada

Desde `apps/api`, con PostgreSQL disponible:

```powershell
node scripts/cir-03-importar-cultivos.mjs
```

Revisar el resumen y el código de confirmación. Si indica `REVISAR_INACTIVO` o `REVISAR_DUPLICADOS`, detener la operación y resolverlos con Coordinación. Después de verificar un respaldo de PostgreSQL:

```powershell
node scripts/cir-03-importar-cultivos.mjs --aplicar --respaldo-confirmado --confirmar CODIGO --usuario-correo CORREO_AUTORIZADO
```

Ejecutar de nuevo la simulación: se esperan 22 `EXISTE`, 0 `CREAR` y 0 `REVISAR`. Pueden existir más de 22 cultivos totales por registros históricos o sintéticos.

## Verificación

- `node --test apps/api/tests/cir-03-catalogo.test.mjs` (desde la raíz del repositorio).
- `npm run build` (desde la raíz).
- Verificar que el catálogo muestre las 22 variedades y que puedan seleccionarse en nuevas siembras.
- Comprobar que la evaluación manual de visitas consulta las opciones activas y que no incluye opciones inactivas descargadas de la API.
- Confirmar que los ciclos existentes conservan sus referencias a `cultivo.id`.
