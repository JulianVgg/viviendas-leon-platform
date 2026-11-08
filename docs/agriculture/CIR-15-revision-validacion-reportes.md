# CIR-15 — Revisión y validación de reportes semestrales

El módulo **Reportes → Reportes** mantiene los filtros y la descarga de CIR-11 a CIR-14.

## Flujo

1. Consultar el año, semestre, familia y comunidad.
2. **Coordinación** (permiso `REPORTE_SEMESTRAL_REVISAR`) registra observaciones y marca «En revisión».
3. **Dirección general** (permiso `REPORTE_SEMESTRAL_VALIDAR`) valida únicamente la versión revisada, siempre que no existan advertencias ni datos inconsistentes.
4. Se registran usuario, fecha, comentario y huella del contenido. Las tablas `reporte_semestral_revision` y `reporte_semestral_evento` conservan el estado y los cambios de aprobación.
5. Si cambian los datos del informe, aparece «Cambios posteriores» y no se presenta como validado hasta volver a revisarlo.

La aprobación no congela físicamente las cosechas ni ventas originales. Su modificación corresponde a los permisos de sus módulos y **cualquier cambio relevante invalida la aprobación vigente**. La interfaz de Reportes no edita estos datos.

## API

- `GET /api/v1/reportes/produccion-semestral` devuelve resumen, revisión y huella actual.
- `POST /api/v1/reportes/produccion-semestral/revisar?anio=...&semestre=...` recibe `{ "huella": "...", "comentario": "..." }`.
- `POST /api/v1/reportes/produccion-semestral/validar?anio=...&semestre=...` recibe el mismo cuerpo.
- `GET /api/v1/reportes/produccion-semestral.xlsx` conserva las dos hojas y refleja el estado de validación vigente.

## Verificación manual

- Probar reportes sin datos y con datos válidos, para ambos semestres.
- Revisar con Coordinación y validar después con Dirección.
- Comprobar que un técnico recibe HTTP 403 al intentar aprobar.
- Registrar una cosecha adicional, refrescar el mismo período y comprobar «Cambios posteriores».
- Confirmar que Excel conserva las dos hojas y muestra «VALIDADO» solo cuando corresponde.
- Comprobar modo oscuro, móvil y manejo de errores de API.
