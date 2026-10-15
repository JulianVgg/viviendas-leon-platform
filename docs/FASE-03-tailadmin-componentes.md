# Fase 3 — Homologación de componentes compartidos TailAdmin Pro 2.4

## Objetivo
Alinear los componentes de UI compartidos al diseño de TailAdmin Pro 2.4 sin reemplazar los contratos de los componentes ni modificar servicios, reglas de negocio, API, rutas ni almacenamiento offline.

## Cambios incluidos
- `Button.tsx`: variantes existentes (primary, secondary, danger, ghost), estados de interacción, tamaños y foco accesible con tonalidades TailAdmin.
- `Card.tsx`: superficie, bordes, cabecera, tipografía y espaciado según las tarjetas Pro.
- `FormField.tsx`: etiquetas, ayudas, error, radio de enfoque y altura de controles; mantiene la vinculación accesible entre `label`, `id` y `aria-describedby`.
- `Badge.tsx`: píldoras semánticas con colores light de TailAdmin.
- `Alert.tsx`: alertas tipo Pro con ícono y cabecera independientes.
- `DataTable.tsx`: cabecera, separadores, filas y estados hover; se preserva la estructura y datos recibidos.
- `PageHeader.tsx`: jerarquía de títulos y espaciado acorde con Pro.
- `EmptyState.tsx`: estado sin datos con iconografía y contenedor neutros.

## Límites
- NO se agregó una biblioteca de componentes ni se copiaron sus vistas demostrativas; se adaptaron las clases de TailAdmin a las interfaces existentes.
- NO se modificaron Familias, Visitas, autenticación, sincronización offline, lógica de formularios, contextos, backend, BD ni rutas.
- La portada/dashboard y las pantallas con clases Tailwind escritas directamente continúan pendientes de una siguiente fase.

## Comprobaciones sugeridas
1. `npm run build -w @viviendas-leon/web` y `npm run dev`.
2. `Familias`: listado con filtros, tabla, badges, paginación; nuevo registro y errores de validación.
3. `Visitas`: agenda, registro, inputs/select/textarea y botones en vista móvil.
4. `Offline`: estados informativos, tablas y botones de sincronización.
5. Modo claro y oscuro; teclado y foco visible; `prefers-reduced-motion`.
6. Revisar clases personalizadas superpuestas en otras páginas.

## Integración Git
Aplicar el parche SOLO cuando las fases 1 y 2 estén integradas en la rama de destino.
Crear una nueva rama, revisar `git diff`, construir y probar antes del commit/PR.
