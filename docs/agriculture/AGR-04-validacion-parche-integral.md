# AGR-04 — Parche integral compatible con `main` 74aeeeeb

## Alcance
- El campo opcional `observacionesCultivo` se registra en la ficha del ciclo seleccionado durante el segundo paso de `Registrar visita`.
- Se conserva el flujo de tres pasos, la seleccion de siembras activas, la cola offline `visits.create.v1`, la idempotencia por `operationId` y el flujo de compromisos y produccion sin cambios.
- La API valida el campo opcional (hasta 2000 caracteres), no modifica el `operationId` y conserva el valor al normalizar la captura. Los historicos anteriores sin el campo siguen siendo validos.
- Para visitas realizadas con `cicloCultivoId`, `EvaluacionCultivo.observaciones` conserva tanto la cantidad de plantas observadas como la observacion propia del cultivo. No se cambian migraciones ni esquema SQL.
- `GET /api/v1/ciclos-cultivo/:id/seguimientos?page=1` retorna evaluaciones paginadas (20 por pagina), fecha de visita, responsable, etapa, calidad y observaciones del ciclo.
- El expediente familiar y la lista general enlazan al historial del ciclo.

## Pruebas antes de integrar
1. En una base **de desarrollo**, ejecutar `npm ci`, `npm run build`, `node --test apps/api/tests/agr04-followup-format.test.mjs` y suites de visitas y sincronizacion.
2. Registrar familia, huerto activo y ciclo. Crear una visita REALIZADA, seleccionar el ciclo, ingresar plantas y una observacion. Consultar `GET /api/v1/ciclos-cultivo/{id}/seguimientos` y abrir `gestion-agricola/ciclos/{id}`. Debe mostrar ciclo, fecha, responsable y observacion.
3. Registrar una segunda visita en otra fecha y verificar que ambas evaluaciones se consultan ordenadas, sin sobrescribir la primera.
4. Desconectar el dispositivo, registrar una visita con observaciones por cultivo, recuperar internet y sincronizar. Reenviar el mismo `operationId`: no debe duplicar visita ni evaluacion.
5. Registrar dos ciclos del mismo cultivo en un huerto: el historial debe mostrar solamente los registros del ID seleccionado.
6. Probar una captura antigua sin `cicloCultivoId` ni `observacionesCultivo`; debe seguir guardandose en `visita_captura` sin relacionar automaticamente un ciclo.
7. Probar acceso sin `PANTALLA_CICLOS`, IDs inexistentes, paginacion incorrecta y guardado con observaciones demasiado extensas.
8. Revisar junto a Julian cambios simultaneos de `VisitRegisterPage.tsx`, `visitService.ts`, `routes.tsx` y `screenPermissions.ts` antes de fusionar.

**No ejecutar en produccion ni en `main` antes de comprobar los resultados.** Este parche esta basado en el commit indicado y no incluye modificaciones sobre el repositorio remoto.
