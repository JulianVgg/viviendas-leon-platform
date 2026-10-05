# Recuperación de componentes UI base

La capa UI base se ubica en `apps/web/src/components/ui`, siguiendo la documentación del frontend y la convención de alias `@/*`.

Componentes recuperados:

- `Button`: botón genérico con variantes `primary`, `secondary`, `danger` y `ghost`.
- `FormField`: asociación de etiqueta, control, ayuda y error con soporte accesible.
- `Card`: contenedor con `CardHeader` y `CardBody` para contenido agrupado.
- `Alert`: mensaje contextual con variantes informativa, exitosa, de advertencia y de error.
- `LoadingState`: indicador de carga con `role="status"` y texto configurable.
- `SyncStatus`: estado exclusivo de conectividad y sincronización, con contador de pendientes.

No se agregaron dependencias ni lógica de API, persistencia, IndexedDB o formularios de módulos.
