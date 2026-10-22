# Identidad visual — Viviendas León

## Fuente y paleta institucional

- **Color oficial:** `#3C6E8E` (Tailwind `brand-500`). No confundir con estados funcionales.
- **Hover principal:** `brand-600` (`#315D79`). **Texto sobre blanco:** `brand-700` (`#254C66`) cuando se necesite mayor contraste.
- **Tipografía:** PT Sans Regular 400 y Bold 700. CSS importa Google Fonts y usa Segoe UI/Arial como alternativa sin conexión; no se añaden tipografías propietarias al repositorio.
- **Logotipo:** `apps/web/public/branding/viviendas-leon-mark.png`, recortado a partir de `LOGO1.png` entregado por la organización, sin redibujar las iniciales. Ver `BrandMark.tsx`.

## Aplicación visual

1. `apps/web/src/index.css`: escala `brand-25` a `brand-950`, fuentes y anillos de foco.
2. `AppSidebar.tsx` y `AppHeader.tsx`: símbolo corporativo y texto institucional.
3. `LoginPage.tsx`: marca en escritorio y móviles, panel institucional y botones.
4. `index.html` + `vite.config.ts`: metadatos de la PWA; favicon y recursos instalables.
5. Acciones de cuenta, roles, perfil y edición: colores `brand-*`, sin tocar semántica ni permisos.
6. Los colores de los estados permanecen independientes (éxito verde, pendiente amarillo, error rojo, programada azul).

## Verificación propuesta

- Ejecutar `npm run build -w @viviendas-leon/web`.
- Revisar /login en escritorio y teléfono, con tema claro y oscuro.
- Iniciar sesión; comprobar sidebar expandido, colapsado y móvil, barra superior y controles de usuario.
- Revisar /familias, /visitas/agenda, /administracion/roles-permisos (con permisos), acciones primarias y ayudas visuales de estado.
- Instalar la PWA y comprobar iconos y color de interfaz; si había una instalación anterior, actualizar/volver a instalar para refrescar iconos.
- Desconectar la red: verificar que el sistema conserva funcionalidad offline y usa tipografía de reserva cuando la fuente externa no esté en caché.

> No se modifican servicios, sesiones, endpoints, rutas, migraciones ni reglas de autorización.
