# NTF-02 — Centro de notificaciones en la interfaz

Issue: **#171**. Depende de **NTF-01 (#170)**.

## Alcance

- Se reutiliza el botón de campana que ya existía en `AppHeader` y `NotificationDropdown`. No se agrega otra campana.
- Contador real de avisos no leídos desde `GET /api/v1/notificaciones/contador`, actualizado al cargar, recuperar el foco y cada 60 segundos mientras la pestaña esté visible. **No es push**; NTF-11/12 se encargarán de ello.
- Panel desplegable basado en el patrón visual de TailAdmin Pro (título, cierre, lista desplazable, botón inferior). Muestra las diez notificaciones más recientes desde la API de NTF-01.
- Lectura individual y masiva mediante `PATCH` real; actualiza el contador sin refrescar la página.
- Vista «Ver todas las notificaciones» en `/notificaciones` con filtros Todas / No leídas / Leídas y paginación de 20 registros.
- Navegación opcional a `referencia` si se trata de ruta interna permitida para el usuario; si no tiene destino válido, la acción solamente marca la notificación como leída.
- Experiencia adaptativa para móvil, pantalla grande, teclado y tema oscuro. Estados de carga, vacío y error.
- Todas las notificaciones se obtienen desde la API; no hay avisos simulados ni imágenes ficticias de la plantilla.

## Rutas y archivos

- `apps/web/src/components/header/NotificationDropdown.tsx`: campana, contador y panel.
- `apps/web/src/features/notifications/services/notificationsService.ts`: cliente HTTP tipado de NTF-01.
- `apps/web/src/features/notifications/components/NotificacionItem.tsx`: ítem visual reutilizable.
- `apps/web/src/features/notifications/utils/notificationUtils.ts`: destino interno seguro y fechas en español.
- `apps/web/src/features/notifications/pages/NotificacionesPage.tsx`: vista completa.
- `apps/web/src/app/routes.tsx`: registro de `/notificaciones`.
- `apps/web/src/features/auth/screenPermissions.ts`: la bandeja personal es accesible a cualquier usuario con sesión.

## Pruebas manuales

1. Asegúrate de que NTF-01 esté aplicado y la sesión esté iniciada.
2. Inserta dos notificaciones de prueba para **tu usuario**, siguiendo `docs/NTF-01-api-notificaciones.md`: una con `referencia='/calendario'` y otra con `referencia=NULL`.
3. Comprueba que la campana muestre 2 pendientes (puede tardar hasta 60 segundos si ya estaba abierta la aplicación).
4. Abre el panel y confirma título, mensaje, tipo y fecha; no debe haber usuarios o avisos de TailAdmin.
5. Pulsa una notificación con referencia y permiso: debe quedar leída y abrir la sección. Una sin referencia debe marcarse como leída sin cambiar de pantalla.
6. En «Ver todas», cambia entre filtros, utiliza la paginación y marca todas como leídas. Verifica que el contador sea cero.
7. Con un segundo usuario comprueba que no aparecen las notificaciones del primero.
8. Revisa móvil y tema oscuro. Desconecta el backend: debe aparecer un estado de error, no datos ficticios.
9. Verifica `npm run build -w @viviendas-leon/web`.

## Fuera de alcance

Generación automática por eventos, recordatorios programados, Web Push, invitaciones, WhatsApp y edición de preferencias. Se implementarán en sus respectivas historias NTF-03 en adelante.
