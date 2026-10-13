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

## Verificación responsive y estados

La revisión del layout cubre los breakpoints de Tailwind utilizados por la aplicación: móvil pequeño (`320px`), móvil (`360px`), tablet (`768px`), escritorio pequeño (`1024px`) y escritorio (`1280px` o superior).

Correcciones aplicadas:

- El encabezado reduce espacios en móvil, oculta únicamente la marca secundaria y mantiene el menú, tema, notificaciones y perfil disponibles.
- El contenedor principal ya no utiliza `overflow-x-clip`, evitando ocultar contenido accidentalmente.
- Sidebar, backdrop, enlaces, botones y controles del encabezado tienen una indicación `focus-visible` consistente.
- El símbolo decorativo de `EmptyState` está marcado con `aria-hidden="true"`.
- `DataTableContainer` conserva `overflow-x-auto` para tablas anchas.

Estados disponibles para verificación:

- Carga: `LoadingState`.
- Vacío: `EmptyState`.
- Error y confirmación: `Alert`.
- Sin conexión y sincronización: `SyncStatus`, preparado para conectarse a la infraestructura futura de sincronización.

La revisión realizada en este entorno fue estática. No se contó con una herramienta de navegador automatizado para medir visualmente cada viewport ni con una herramienta automatizada de contraste. La verificación visual interactiva y de teclado debe completarse en un navegador antes de cerrar el issue.

## Adaptación visual TailAdmin PRO — Etapa 2

Se modernizaron FormField, Form, FormSection, FormGrid y FormActions sin modificar sus props anteriores, validaciones de negocio ni valores del formulario.

- `formControlClassName` utiliza altura de 44px, bordes, sombra y foco con tokens de la Etapa 1. Añade estilos para `aria-invalid="true"`, `disabled` y el atributo explícito `readonly`, con variantes oscuras. No aplica apariencia de solo lectura a selects editables. Los consumidores pueden seguir sobrescribiendo dimensiones mediante sus clases.
- `FormField` conserva `label`, `id`, `hint`, `error`, `required` y `children`. Si contiene un único input, select o textarea nativo directo, asocia automáticamente label y mensaje; respeta el ID del control cuando no se proporciona `id` al campo y genera uno único si ambos faltan. Conserva los atributos ARIA explícitos, combina `aria-describedby` sin duplicados y completa `aria-invalid`/`aria-required` cuando no existen. No altera eventos, valores, refs ni validaciones nativas. Para componentes personalizados, controles anidados o múltiples controles, el consumidor sigue gestionando las asociaciones; no se clonan esos controles.
- Los errores conservan `${id}-error` y `role="alert"`; los hints reciben `${id}-hint`. El error sustituye visualmente al hint, como antes.
- `Form` mantiene los modos y los siete estados. El fieldset continúa bloqueando controles durante loading, saving, disabled y readonly. Se conserva la ubicación de `actions` fuera del fieldset: el consumidor debe continuar pasando los flags correspondientes a `FormActions`.
- `FormSection` mantiene variantes plain, outlined y card, con padding responsive y tipografía coherente con Card. En la variante card también muestra una descripción cuando no hay título.
- `FormGrid` mantiene las opciones de una, dos y tres columnas y sus breakpoints; ajusta los espacios entre campos y evita anchos mínimos que dificulten el diseño móvil.
- `FormActions` mantiene etiquetas, tipos submit/button, `onCancel` y bloqueo mediante `submitting`, `disabled` o `blocked`. Añade `aria-busy` e indicador decorativo de guardado, respetando movimiento reducido. No ejecuta guardado ni cancelación por sí mismo.

Las verificaciones de renderizado en memoria cubrieron los siete estados, botones bloqueados, etiquetas de acciones, asociaciones de errores/hints, IDs generados y atributos ARIA existentes. Build y lint validaron la compatibilidad de los usos actuales, incluido FamilyForm. No se ejecutaron pruebas visuales, envíos reales ni pruebas de teclado en navegador. No se modificaron FamilyForm, FamilyListPage, servicios, conectividad, cola offline ni configuración PWA.

## Presentación de FamilyForm — Etapa 3

Los cuatro campos existentes se distribuyen en dos FormSection con variante card:

- **Identificación y ubicación:** nombre de referencia y comunidad, con ayudas sobre el nombre y la identificación del municipio en las opciones.
- **Información complementaria:** fecha de ingreso opcional y observaciones, conservando todos los IDs y límites anteriores.

FamilyCreatePage incorpora un panel de orientación, enlace al listado y contenedor de carga coherente con Card. FormActions mantiene Cancelar, Guardar y el estado de guardado. No se añadieron campos, dependencias ni cambios a `FamilyCreateInput`.

La lógica de FamilyForm anterior al render y sus atributos funcionales se compararon sintácticamente con la versión de partida. Permanecen intactos la validación, normalización del payload, selección de comunidad, enfoque del primer error, mensajes de API, guardia contra doble envío y callback `onCreated`.

Las verificaciones en memoria comprobaron campos vacíos, máximos de longitud, fecha inexistente, payload con campos opcionales, doble envío y errores de API mediante callbacks simulados. No se registraron familias ni se consultó una API real. La matriz manual de pantallas, teclado, temas, viewports y pruebas con API aislada está en [componentes-base.md](./componentes-base.md#matriz-manual-reproducible); todos sus casos siguen pendientes de navegador.

## Actualización de QA en navegador — 2026-10-13

La validación posterior sí utilizó Edge headless con perfil aislado y respuestas de API interceptadas. No hubo acceso a beneficiarios reales ni escrituras de backend. El [informe integral](./componentes-base.md#informe-de-qa-integral--etapas-1-2-y-3) sustituye el estado histórico de pruebas pendientes para los casos efectivamente ejecutados.

- Q08/Q09: formulario vacío, nombre con espacios y límites de longitud rechazados; foco y mensajes asociados. La fecha imposible se normalizó mediante el control nativo; no se declara una nueva prueba independiente de toda la validación de fechas.
- Q10/Q11: respuesta 422 sintética, valores conservados, guardado bloqueado, doble envío, payload y navegación a expediente tras éxito sintético.
- Q13/Q26: comunidades vacías/error, cancelación sin POST, Tab entre campos y foco visible.
- Responsive: cinco viewports en ambos temas; `dark:scheme-dark` corrige el indicador nativo de fecha ilegible en oscuro sin cambiar valores ni validaciones. Se verificó su estilo computado y capturas seleccionadas.

El smoke test con API/base de datos realmente aisladas, lectores de pantalla y otros navegadores permanece no ejecutado. La lógica de FamilyForm y sus cuatro campos no se modificaron durante QA.
