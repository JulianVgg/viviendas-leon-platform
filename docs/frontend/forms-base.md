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

## Creación y edición

El mismo `Form` se reutiliza con `mode="create"` o `mode="edit"`. La feature que lo compone mantiene los valores controlados y proporciona los valores iniciales locales:

```tsx
<Form mode="create">...</Form>
<Form mode="edit">...</Form>
```

Crear inicia con valores vacíos o predeterminados. Editar inicia con una copia local de los valores existentes. `mode` no ejecuta persistencia ni decide cómo guardar.

## Validación y errores

Las validaciones genéricas se ejecutan antes del guardado simulado. Los errores de campo se pasan a `FormField`, que mantiene `aria-invalid`, `aria-describedby`, `aria-required` y la asociación con el mensaje `role="alert"`.

Los errores de elementos repetibles se calculan por elemento mediante `itemError` y se entregan al renderizador correspondiente. Un error de un elemento no altera los demás.

Un error general de la operación se comunica con `Alert`. No sustituye los errores específicos de cada campo.

## Estados

- `loading`: datos iniciales en preparación; bloquea los controles y muestra `LoadingState` en la demostración.
- `saving`: guardado simulado en curso; bloquea campos y acciones.
- `success`: operación simulada completada; permite continuar editando.
- `error`: operación simulada fallida; conserva los datos y permite reintentar.
- `disabled`: formulario y colecciones bloqueados.
- `readonly`: información visible sin edición.

La demostración permite seleccionar estos estados de forma determinista y elegir si el guardado simulado termina en éxito o error. La cancelación solo ejecuta el callback local y muestra un aviso; no modifica datos persistidos.

## Cuándo usar un repeater

Debe utilizarse cuando la base de datos representa una colección 1:N o una relación repetible, como integrantes, evaluaciones o tratamientos. No debe utilizarse para agrupar campos fijos ni para reemplazar catálogos o relaciones que deben seleccionarse mediante claves.

## Ejemplo aplicado al dominio de ViviendasLeón

La demostración de `FormPatternDemo` utiliza la composición realista, pero no representa un módulo funcional:

```text
Visita
├── Información general
│   ├── Familia
│   ├── Usuario responsable
│   ├── Fecha
│   ├── Condición climática
│   └── Observaciones
└── Evaluaciones de cultivo[]
    ├── Ciclo de cultivo
    ├── Etapa
    ├── Calidad
    ├── Enfermedades[]
    ├── Plagas[]
    └── Tratamientos[]
```

Una visita puede contener múltiples evaluaciones. Cada evaluación mantiene sus propias enfermedades, plagas y tratamientos, por lo que modificar una evaluación no modifica las colecciones de otra.

La condición climática pertenece a la visita porque describe el contexto de la actividad completa y no un cultivo individual. La evaluación selecciona un ciclo de cultivo existente; no crea ni modifica el ciclo. La etapa y la calidad pertenecen a la evaluación, porque describen el estado observado durante esa visita. Las enfermedades, plagas y tratamientos también pertenecen a la evaluación que los identificó o aplicó.

Los selectores de familias, usuarios, ciclos, etapas, calidades, enfermedades, plagas, insumos, unidades y condiciones climáticas utilizan catálogos estáticos locales. La demostración no realiza consultas externas ni representa autenticación, inventario o persistencia.
