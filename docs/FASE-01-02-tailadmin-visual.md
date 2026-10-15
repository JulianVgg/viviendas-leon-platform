# Fases 1 y 2 — Homologación visual TailAdmin Pro 2.4

## Alcance

- Recupera los tokens visuales oficiales de TailAdmin Pro 2.4 (color, tipografía, tamaños, sombras y breakpoints extendidos), conservando Tailwind CSS 4 y el modo oscuro.
- Añade la fuente Outfit con **fallback del sistema cuando no haya conexión**. No se incorporan fuentes binarias ni dependencias nuevas.
- Adapta los estilos base de navegación (`layout-*`) al diseño TailAdmin y su scrollbar.
- Convierte los submenús del sidebar en acordeones CSS Grid de 300 ms. Usa `inert` y `aria-hidden` para evitar el foco de elementos colapsados.
- Suaviza la apertura/cierre de desplegables de usuario y notificaciones (180 ms, escala + opacidad), preservando cierre con Escape, clic fuera y navegación por teclado.
- Anima el backdrop móvil y ajusta colores de sidebar, header, layout y la identidad visual del manifiesto PWA.
- Conserva rutas, permisos, roles, formularios, módulos, integración API, IndexedDB y lógica de sincronización.

## Archivos modificados

- `apps/web/src/index.css`
- `apps/web/src/app/layout/AppLayout.tsx`
- `apps/web/src/app/layout/AppSidebar.tsx`
- `apps/web/src/app/layout/AppHeader.tsx`
- `apps/web/src/app/layout/Backdrop.tsx`
- `apps/web/src/components/header/NotificationDropdown.tsx`
- `apps/web/index.html`
- `apps/web/vite.config.ts`

## Comprobaciones

- TypeScript `tsc -b apps/web/tsconfig.app.json apps/web/tsconfig.node.json`: correcto.
- Sintaxis CSS: parseada correctamente con PostCSS.
- La compilación completa de Vite **no se pudo ejecutar en el entorno de revisión Linux**: el ZIP aportado contiene binarios nativos de Windows para Rolldown. No debe interpretarse como un fallo del proyecto; se debe compilar en el entorno de desarrollo normal.

## Verificación en el equipo

Desde la raíz del repositorio (rama independiente):

```bash
npm ci
npm run build -w @viviendas-leon/web
npm run dev
```

Probar, tanto en escritorio como en móvil:

1. Menú: expandir/contraer, hover en barra colapsada, submenús y ruta activa.
2. Cabecera: usuario y notificaciones (clic afuera, Escape, tabulación).
3. Tema claro/oscuro, recarga, roles, login/logout.
4. Navegación a Familias y Visitas Técnicas; registros y formularios sin cambios.
5. PWA: con/sin conexión (Outfit tiene fallback mientras esté offline), indicador de sincronización y manifest.
6. En `prefers-reduced-motion: reduce`, transiciones desactivadas.

## Pendiente deliberadamente para fase 3

Homologar `components/ui/*` y las pantallas internas (tarjetas, botones, modales y formularios). La fuente Outfit depende de Google Fonts cuando hay internet; para una paridad tipográfica completamente offline se debe distribuir una fuente con licencia adecuada en una implementación posterior, si la política del proyecto lo permite.
