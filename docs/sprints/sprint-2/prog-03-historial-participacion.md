# PROG-03 — Historial de participación familiar

## Alcance

El historial se presenta **dentro del expediente integral de la familia**, en su pestaña «Programas». La consulta existente `GET /api/v1/familias/:id/expediente` devuelve todas las relaciones `familia_programa` de la familia consultada, incluso las participaciones finalizadas y retiradas. La vista no realiza solicitudes adicionales, modificaciones ni almacenamiento offline de datos personales.

## Visualización

- Resumen de total, activas, anteriores y sin clasificar.
- Filtros locales de solo lectura: todas, activas, anteriores y sin clasificar.
- Orden descendente por fecha de ingreso, fechas faltantes al final; en empate, asociación de mayor ID primero.
- Programa, identificadores de programa y asociación, fechas de ingreso/salida, estado y observaciones.
- Los estados `ACTIVO`, `FINALIZADO` y `RETIRADO` se clasifican; valores nulos o personalizados **no** se infieren como finalizados y permanecen en «Sin clasificar».
- Sin relaciones: «Sin programas asociados». Un filtro vacío no implica eliminación de datos.
- Las participaciones con programas institucionales inactivos siguen consultables porque el expediente no filtra por `programa.estado`.

## Contrato y conservación

Se reutilizan `findIntegralFamily` y `IntegralFamilyRecord.programas`, sin cambios de rutas, permisos, Prisma o estructura PostgreSQL. La relación `familia_programa` conserva **un registro por pareja familia-programa** (`@@unique([familiaId, programaId])`): PROG-03 permite ver los estados actuales y anteriores de programas distintos, pero no versiones sucesivas ni múltiples ciclos históricos de una misma pareja. La bitácora de PROG-02 registra modificaciones sin convertirse en una nueva línea de tiempo en este alcance.

## Pruebas

`node --experimental-strip-types --test apps/web/tests/familyProgramHistory.test.mjs` verifica orden, filtrado, categorías heredadas, conteos y no mutación. La suite existente `familyRecord.test.mjs` prueba además la interfaz del expediente, con HTTP simulado y el navegador configurado según los scripts del proyecto. La prueba QA `families-record.qa.test.mjs` compara las participaciones devueltas con SQL independiente por ID familiar. La ejecución de suites de navegador y QA real debe realizarse en un entorno que disponga de esas dependencias.

## Criterios de aceptación

- Se muestran todas las participaciones registradas para el expediente.
- Ningún registro de otro expediente se añade a la consulta ni al filtrado local.
- Las participaciones anteriores y los estados heredados se conservan y siguen disponibles al seleccionar «Todas».
