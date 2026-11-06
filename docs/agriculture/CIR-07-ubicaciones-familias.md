# CIR-07 — Ubicaciones geográficas de familias

- El esquema almacena latitud/longitud opcionales, **ambas o ninguna**. No cambia asociaciones con huertos, ciclos o visitas.
- Las coordenadas están disponibles solamente en el endpoint autenticado `GET /api/v1/familias/:id/ubicacion`, restringido a `FAMILIAS_WRITE` (o Dirección general). **No** se incluyen en listados, dashboards ni en la respuesta general del expediente ni en cachés offline.
- La edición manual está dentro del expediente familiar, pestaña Información general, para usuarios autorizados con conexión. Se utiliza `PATCH /api/v1/familias/:id` con versión y bitácora, sin exponer valores en la bitácora.
- La lista oficial de 19 ubicaciones se mantiene **fuera del repositorio público**, en `apps/api/private/cir-07/ubicaciones-oficiales.csv`. La migración por sí sola NO importa direcciones.
- Antes de cargar: aplicar migración, confirmar respaldo, simular, revisar coincidencia exclusiva de nombre/comunidad/municipio y confirmar el código de simulación.
- No crear familias, comunidades ni huertos automáticamente. No sobrescribir coordenadas ya presentes con valores diferentes: conciliar primero.
- El estado activo de una familia no se deduce de que tenga coordenadas.

## Verificación

1. Ejecutar migración de Prisma y generar cliente.
2. `npm run build` y `node --test apps/api/tests/cir07-coordenadas.test.mjs apps/api/tests/cir07-import.test.mjs`.
3. Probar `GET` de coordenadas como usuario con `FAMILIAS_WRITE` y como técnico sin ese permiso (403).
4. Confirmar que las coordenadas no aparecen en GET de listas o expediente general y que la interfaz no las muestra a usuarios sin permiso.
5. Ejecutar simulación de CSV privado y revisión; aplicar solo con aprobación y respaldo comprobado.
6. Verificar 19 coincidencias exactas y 0 discrepancias mediante una segunda simulación.

**Pendiente institucional:** Confirmar que las coordenadas del documento representan las ubicaciones vigentes de las participantes y corregir nombres abreviados si procede.
