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
