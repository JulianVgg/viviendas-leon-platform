# Ajustes de interfaz, permisos y revisión MON-01

## Cambios incluidos

- El calendario institucional no crea ni traslada eventos a fechas anteriores a hoy (día civil de Guatemala). La validación es de interfaz y de API; las actividades históricas siguen consultables.
- Mi perfil: Dirección general y Coordinación editan nombre, apellido, correo, teléfono, fotografía y dirección; el resto solo puede modificar teléfono. El servidor aplica los mismos permisos en PATCH de perfil, dirección, PUT/DELETE de fotografía.
- Al tocar la fotografía del encabezado de Mi perfil, un supervisor abre el editor con la carga de imagen disponible. La fotografía sigue siendo JPG/PNG de máximo 2 MB.
- Departamento: selector de los 22 departamentos; municipio: sugerencias del catálogo de municipios activos existente (no es aún un catálogo territorial nacional por departamento).
- Administración / Usuarios: el modal se monta mediante portal para que no lo recorte la tabla ni lo alteren contenedores con transformaciones.
- Se eliminó Voluntariado del menú y «Vista general» de Gestión agrícola y Reportes.
- El sincronizador automático de visitas no se ejecuta para Dirección ni Coordinación. Los registros locales de un técnico siguen asociados a ese técnico; no se eliminan operaciones de IndexedDB.

## Limitación del catálogo territorial

El esquema `Municipio` del sistema guarda `id`, `nombre` y `activo`, pero no contiene una FK de departamento ni el catálogo oficial completo. Por tanto, el selector de municipio presenta sugerencias de los municipios activos que tiene la instalación y no puede garantizar que pertenezcan al departamento elegido. Antes de producción se recomienda incorporar un catálogo territorial versionado con los 340 municipios y los 22 departamentos, identificadores y validación de correspondencia en el backend. No se debe improvisar una lista incompleta ni depender de peticiones externas para ese dato en una PWA.

## MON-01 — Evaluación respecto al issue #75

**Estado: incompleto.** En `DashboardPage.tsx` el panel principal monta `MiAgendaDashboard` y accesos rápidos; `MiAgendaDashboard` consulta `/api/v1/mi-agenda`, ofrece indicadores personales (hoy, próximas actividades, visitas, compromisos) y algunas visitas vencidas para supervisión. No existe aún un dashboard **general por programas** con métricas institucionales y consultas agregadas para MON-01.

| Criterio de MON-01 | Evaluación |
|---|---|
| Indicadores calculados con información real | Sí, pero solo los indicadores personales de NTF-06, no el resumen general de programas |
| Dashboard se visualiza correctamente | Sí para la agenda personal; no se ha implementado el dashboard general MON-01 |
| Datos se actualizan según registros existentes | Parcial: las consultas personales son reales, pero falta fuente agregada por programa |

Se recomienda una historia separada para diseñar `/api/v1/dashboard/resumen` con permisos por rol, número de familias activas por programa, cobertura agrícola y ejecución de visitas/capacitaciones, antes de dar MON-01 por completado. No crear cifras de demostración para simular indicadores reales.

## Validación local

1. Dirección y Coordinación: crear eventos para hoy y futuras fechas; intentar fecha pasada y confirmar HTTP 422.
2. Técnico: intentar PATCH de perfil cambiando `nombre` y comprobar HTTP 403; editar únicamente `telefono` y comprobar éxito.
3. Técnico: intentar PUT/DELETE de foto y PATCH de dirección, confirmar HTTP 403.
4. Dirección: editar fotografía desde el avatar y comprobar encabezado actualizado; editar dirección.
5. Verificar los 22 departamentos y las sugerencias municipales que realmente estén en el catálogo local.
6. Abrir Administración → Usuarios → Editar con sidebar desplegado y table scroll: modal centrado sin recorte.
7. Revisar ausencia de Voluntariado y Vista general de Gestión agrícola y Reportes.
8. Dirección: recargar calendario tras conectarse y confirmar ausencia de `POST /api/v1/visitas/sync` automático; técnico conserva sincronización normal.

## Nota de migraciones

No requiere migraciones de Prisma. La corrección completa del catálogo territorial **sí** requerirá una decisión posterior sobre esquema, carga inicial y validaciones.
