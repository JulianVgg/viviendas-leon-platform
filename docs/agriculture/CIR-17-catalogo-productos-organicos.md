# CIR-17 — Catálogo de productos y tratamientos orgánicos

La aplicación reutiliza `categoria_insumo` e `insumo`; no se crea una tabla de productos paralela. Se eliminan las listas fijas antiguas de insecticidas/fertilizantes en `visitCatalogs.ts` porque no eran utilizadas por los formularios. Las aplicaciones reales siguen usando `tratamiento_aplicado` (CIR-18).

## Administración

Ruta: **Gestión agrícola → Insumos**.

- Dirección general y Coordinación (permiso `INSUMOS_WRITE`) administran categorías y productos.
- Los usuarios con `PANTALLA_INSUMOS` consultan el catálogo.
- Personal autorizado a registrar/consultar visitas puede obtener productos activos con `GET /api/v1/insumos/disponibles`; se usará como origen en CIR-18.
- Los cambios se registran en `bitacora`. La desactivación no elimina referencias históricas.
- Se previenen duplicados de nombres equivalentes (acentos, espacios, mayúsculas) mediante comprobación transaccional y bloqueo por nombre.

## Productos propuestos (pendientes de confirmar)

La migración presenta estas opciones **INACTIVAS** hasta que Yohan confirme su nombre, categoría y uso:

| Producto | Categoría provisional |
| --- | --- |
| Microorganismos de montaña | Microorganismos benéficos |
| Lombricompost | Abonos orgánicos |
| Super magro | Preparados líquidos orgánicos |
| Lixiviados | Preparados líquidos orgánicos |

La organización puede corregir la categoría y activar cada opción desde la interfaz después de validar la información. No se deben considerar oficiales los nombres y clasificaciones provisionales solo por haber ejecutado la migración.

## Endpoints

- `GET /api/v1/insumos` — listado completo (incluye inactivos), permiso `PANTALLA_INSUMOS`.
- `GET /api/v1/insumos/categorias` — categorías, permiso `PANTALLA_INSUMOS`.
- `GET /api/v1/insumos/disponibles` — productos activos de categorías activas, solo personal autorizado.
- `POST/PATCH /api/v1/insumos` y `/categorias` — requiere `INSUMOS_WRITE`.

**Fuera de CIR-17:** registro de aplicación, fecha, dosis y unidad durante una visita técnica. Eso se integra en CIR-18 sin cambiar de catálogo.
