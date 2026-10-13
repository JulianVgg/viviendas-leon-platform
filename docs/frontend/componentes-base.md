# Componentes base

La interfaz reutiliza Tailwind CSS y los componentes de `apps/web/src/components/ui`. No se utiliza una librería UI externa. Los componentes deben resolver necesidades comunes de los módulos sin crear una capa de diseño independiente.

## Criterios comunes

- Usar los componentes base antes de crear estilos locales.
- Mantener `Inter`, la escala de espaciado de Tailwind y los radios existentes.
- Todos los controles interactivos deben mostrar foco visible y tener nombre accesible.
- Las variantes de estado deben combinar color con texto o información semántica.
- Los componentes deben funcionar en tema claro, oscuro y pantallas pequeñas.

## Button

Botón para acciones explícitas del usuario.

Variantes: `primary`, `secondary`, `danger`, `ghost`. Tamaños: `sm`, `md`, `lg`. Acepta las propiedades nativas de `button`, incluyendo `disabled`.

```tsx
<Button variant="primary" onClick={save}>Guardar</Button>
<Button variant="danger" disabled>Eliminar</Button>
```

## Card

Contenedor para agrupar información relacionada. `CardHeader` resuelve título, descripción y acciones; `CardBody` mantiene el padding común.

```tsx
<Card>
  <CardHeader title="Listado" description="Registros recientes" />
  <CardBody>Contenido del módulo</CardBody>
</Card>
```

## Badge

Etiqueta breve para estados o categorías.

Variantes: `neutral`, `success`, `warning`, `error`.

```tsx
<Badge variant="success">Activo</Badge>
```

## FormField

Agrupa label, control, ayuda y error de un formulario. El control hijo debe recibir el mismo `id` del campo y asociar el mensaje de error cuando sea necesario.

```tsx
<FormField label="Comunidad" id="community" required hint="Selecciona una comunidad.">
  <select id="community" className={formControlClassName} />
</FormField>
```

## DataTable

Tabla responsive para listados de módulos. Recibe `columns`, `rows` y un `caption` opcional para accesibilidad. `DataTableContainer` permanece disponible como fachada compatible.

```tsx
<DataTable columns={['Familia', 'Estado']} rows={rows} caption="Familias registradas" />
```

## Dialog

Diálogo modal para confirmaciones o formularios breves. Requiere `open`, `onClose` y un título. El fondo y el botón de cierre permiten salir del diálogo.

```tsx
<Dialog open={isOpen} title="Confirmar registro" onClose={() => setOpen(false)}>
  ¿Deseas continuar?
</Dialog>
```

## Alert

Mensaje contextual persistente para comunicar información o resultados.

Variantes: `info`, `success`, `warning`, `error`.

```tsx
<Alert variant="error" title="No se pudo guardar">Revisa los campos requeridos.</Alert>
```

## LoadingState

Estado de carga para contenido que todavía no está disponible.

```tsx
<LoadingState label="Cargando familias..." />
```

## SyncStatus

Representa conectividad y sincronización para soportar el funcionamiento sin conexión.

Estados: `synced`, `syncing`, `pending`, `offline`, `error`. `pendingCount` muestra cuántos registros locales esperan sincronización.

```tsx
<SyncStatus state="pending" pendingCount={3} />
```

## Componentes existentes conservados

- `PageHeader`: título, descripción, breadcrumb y acciones de página.
- `PageBreadCrumb`: contexto de navegación.
- `EmptyState`: ausencia de registros, con acción opcional.
- `NotificationDropdown`: avisos del encabezado.
- `ComponentCard`: fachada compatible que usa `Card`.
- `DataTableContainer`: fachada compatible que usa `DataTable`.

## Adaptación TailAdmin PRO — Etapa 2

Se adaptaron los estilos de los componentes existentes tomando como referencia Button, Badge, Alert, ComponentCard, Modal y BasicTableOne de TailAdmin React PRO 2.4. No se importaron sus contratos, datos de ejemplo ni estilos globales. Se conservan Inter, los breakpoints actuales y los tokens `brand` y `shadow-theme-*` de la Etapa 1, sin dependencias adicionales.

- **Button:** conserva `forwardRef`, atributos y eventos nativos, las cuatro variantes y los tres tamaños. Usa foco visible con tokens institucionales, sombras discretas y estados hover/active limitados a botones habilitados. No cambia el `type` recibido ni añade uno predeterminado.
- **Badge:** conserva variantes, contenido ReactNode y atributos HTML, con borde sutil y colores claros/oscuros. No añade un rol automático; los estados anunciados siguen siendo responsabilidad de `SyncStatus` o del consumidor.
- **Alert:** conserva `title`, `children`, variantes y atributos HTML. Mantiene `alert` para errores y `status` para el resto, salvo un `role` explícito del consumidor. Añade un icono decorativo por variante y mantiene el contenido dinámico, incluidos botones y el valor `0`.
- **Card:** conserva Card, CardHeader y CardBody. Ajusta tipografía, padding responsive y distribución de acciones. `ComponentCard` sigue siendo una fachada; además de sus props anteriores, acepta opcionalmente `actions` y `className`, sin exigir cambios en sus usos.
- **Dialog:** conserva `open`, `onClose`, `title`, `description`, `children` y `actions`. Se renderiza mediante un portal a `document.body` y un `<dialog>` nativo abierto con `showModal()`: el navegador administra la capa modal, el foco y el aislamiento del fondo. Los IDs de título y descripción son únicos. El foco inicial va a Cerrar; Escape solicita `onClose` sin cerrar por su cuenta el estado controlado. El backdrop también solicita cierre. Al cerrar o desmontar, restaura el foco si el elemento original sigue conectado y el estilo anterior de scroll, incluida su prioridad CSS. Los diálogos comparten el bloqueo de scroll. El padre debe actualizar `open` al recibir `onClose`.
- **DataTable:** conserva `columns: string[]`, `rows: ReactNode[][]`, `caption` y `className`. Añade marco, cabecera diferenciada y estados hover/focus de fila. Mantiene `scope="col"`, caption accesible y scroll horizontal, ahora enfocable por teclado como región etiquetada. `DataTableContainer` delega también las props opcionales `caption` y `className`. No añade filtros, ordenamiento ni paginación.

### Verificaciones de esta etapa

- Build y lint iniciales y finales desde la raíz, más `git diff --check`.
- Verificaciones puntuales en memoria de renderizado HTML y contratos: variantes/tamaños y forwarding de Button, roles y contenido de Badge/Alert, composición de Card, campos y mensajes, estados de formularios, tablas dinámicas y Dialog cerrado.
- Ciclo de Dialog verificado con un DOM simulado: IDs, foco inicial/restaurado, cierre solicitado, bloqueo de scroll compartido y restauración del estilo previo. Esto **no sustituye** una prueba del comportamiento nativo de `showModal()`.
- No se ejecutaron pruebas visuales ni de interacción en un navegador real. Queda pendiente comprobar teclado, lector de pantalla, contraste medido, tema claro/oscuro y pantallas pequeñas. Dialog no tiene consumidores de pantalla actualmente; su apertura debe probarse antes de integrarlo en un flujo funcional.

No se modificaron páginas, datos, servicios, roles, rutas ni persistencia offline.
