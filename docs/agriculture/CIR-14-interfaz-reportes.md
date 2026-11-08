# CIR-14 — Interfaz de producción semestral

La opción existente **Gestión → Reportes → Reportes** (`/reportes/reportes`) permite consultar y descargar el informe semestral de producciones agrícolas.

## Flujo

1. Seleccionar año, semestre (enero–junio o julio–diciembre), comunidad y familia opcionales.
2. La vista previa se actualiza desde `GET /api/v1/reportes/produccion-semestral` al cambiar filtros.
3. La descarga utiliza `GET /api/v1/reportes/produccion-semestral.xlsx` con los mismos filtros y sesión.
4. La exportación mantiene las hojas «Producciones agrícolas» y «Detalle de registros» creadas en CIR-12/CIR-13.

El catálogo de comunidades y familias se consulta desde `GET /api/v1/reportes/produccion-semestral/filtros` con `PANTALLA_REPORTES_LISTA`. El endpoint solamente devuelve IDs, nombres y asociación comunitaria; **nunca coordenadas**. Dirección General tiene acceso por rol; otras cuentas requieren permiso de reportes.

La vista identifica advertencias e informes preliminares. No modifica cosechas, ventas, estimaciones o datos históricos, y exige conexión a la API.

## Pruebas manuales

- Comprobar la navegación desde el menú **Reportes** (y la redirección `/reportes`).
- Cambiar año/semestre, comunidad y familia; la vista previa se actualiza sin mezclar períodos.
- Comprobar un semestre sin datos (totales en cero y Excel válido).
- Descargar el XLSX, verificar las dos hojas y su concordancia con los filtros.
- Comprobar sin permiso de reportes: la API responde 403 y la interfaz no expone los registros.
- Comprobar estado offline y fallos de red; la vista muestra un mensaje y deshabilita la exportación.
