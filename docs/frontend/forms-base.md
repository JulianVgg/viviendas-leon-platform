# Infraestructura base de formularios

La infraestructura reutilizable se ubica en `apps/web/src/components/forms` y reutiliza los componentes de `components/ui`.

- `Form`: estructura general, modo de creación/edición, estados visuales, error general y accesibilidad básica.
- `FormSection`: agrupación flexible en modo simple, outlined o `Card`.
- `FormActions`: acciones consistentes de cancelar y guardar.
- `FormGrid`: layout responsive de una, dos o tres columnas.
- `FormRepeater`: colección local de elementos con identificadores estables, alta, edición, eliminación visual, errores por elemento y bloqueo `disabled`/`readonly`.

La fase no incluye API, persistencia, IndexedDB, sincronización, validaciones de entidades ni generación dinámica de formularios. `RelationSelector` no se implementó; los controles relacionados pueden recibirse como selects controlados mediante props.

## Patrón padre-hijo

El formulario padre mantiene el estado general y compone una colección de hijos mediante `FormRepeater`:

```text
Form
├── FormSection: datos principales
└── FormRepeater: elementos hijos
```

El callback `onChange` del repeater entrega los valores locales al padre. El repeater no conoce entidades de negocio ni identificadores de base de datos.

## Colecciones anidadas

Un elemento renderizado por `FormRepeater` puede incluir otro `FormRepeater`. Esto permite representar, por ejemplo:

```text
Registro
└── Evaluaciones
    └── Tratamientos
```

Para ViviendasLeón, una evaluación debe seguir asociada a un ciclo de cultivo existente durante una visita. `etapa_cultivo_id` y `calidad_id` pertenecen a la evaluación, no al ciclo de cultivo.

## Errores por elemento

`itemError` calcula un mensaje independiente para cada elemento. El renderizador recibe ese mensaje como quinto argumento y puede pasarlo a `FormField`. Así, el error de un hijo no altera visualmente los demás.

## Estados e identificadores

Los IDs generados por `FormRepeater` son locales y temporales. Solo sirven para renderizado, edición, eliminación y asociación de controles durante la vida del formulario. No representan IDs de base de datos.

`disabled` y `readonly` impiden editar, agregar o eliminar elementos. Los estados de sincronización continúan siendo responsabilidad de `SyncStatus`.

## Cuándo usar un repeater

Debe utilizarse cuando la base de datos representa una colección 1:N o una relación repetible, como integrantes, evaluaciones o tratamientos. No debe utilizarse para agrupar campos fijos ni para reemplazar catálogos o relaciones que deben seleccionarse mediante claves.
