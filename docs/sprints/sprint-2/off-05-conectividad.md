# OFF-05 — Detección de pérdida y recuperación de conectividad

**Issue:** #71 · **Sprint:** 2 · **Puntos:** 5 · **Tipo:** task

## Objetivo

Detectar pérdida y recuperación de conectividad; diferenciar la desconexión del navegador de la indisponibilidad temporal de la API, mostrar retroalimentación y habilitar un punto de integración para la sincronización futura.

## Estado previo verificado

- OFF-01: PWA con Workbox.
- OFF-02: almacenamiento `essential-data` y consultas locales.
- OFF-03: operaciones locales `pending-operations`.
- OFF-04: estados `pending/syncing/failed/synced` con **confirmaciones simuladas** en la página de pruebas. **No hay sincronización real con PostgreSQL**.
- El backend ya expone `GET /api/health` y Vite hace proxy de `/api` a `localhost:3000` en desarrollo.
- `useOnlineStatus()` se conserva sin cambios para compatibilidad en pantallas de pruebas previas.

## Implementación de OFF-05

- `src/services/connectivity.ts`: monitor compartido que observa eventos del navegador y verifica `/api/health` cada 15 segundos, al recuperar foco y al reactivar la pestaña. Tiempo máximo por intento: 5 segundos.
- `src/hooks/useConnectivityStatus.ts`: suscripción React al estado compartido.
- `src/components/ui/SyncStatus.tsx`, `src/app/layout/AppHeader.tsx`: estados y mensajes visuales de conectividad.
- `src/app/layout/ConnectivitySyncBridge.tsx`: al recuperar una API válida, consulta la cola y dispara el evento `viviendas-leon:sync-ready`, cuyo `detail.pendingCount` indica las operaciones aún sin confirmar localmente.
- `src/features/offline/pages/OfflineConnectivityTestPage.tsx`: página de prueba solo disponible en desarrollo.
- `src/app/routes.tsx`, `src/app/layout/AppLayout.tsx`: integración global.

**Todas las rutas `src/` son relativas a `apps/web/`.**

## Comportamiento / límites

- `offline`: el navegador reporta falta de conexión.
- `checking`: verificando la API.
- `server-unavailable`: el navegador tiene red pero el servidor no responde con JSON `{status:'ok'}`.
- `connected`: el servidor responde correctamente.
- Solo se genera un evento de recuperación tras pasar desde `offline` o `server-unavailable` a `connected`, **no al abrir la aplicación por primera vez con conexión**.
- El evento de recuperación **no modifica** `pending-operations`, no invoca `processQueueOperation`, no envía HTTP POST ni finge un acuse del servidor.
- `GET /api/health` verifica disponibilidad del servicio HTTP, no garantiza acceso a PostgreSQL ni autorización del usuario.
- En despliegues de producción hay que configurar `/api` mediante proxy o gateway apuntando al backend; el proxy de Vite solo existe en desarrollo.

## Plan de pruebas (registrar resultados reales)

| Prueba | Resultado esperado | Estado |
|---|---|---|
| Frontend y API levantados | Estado conectado, sin evento inicial de reconexión | Pendiente |
| Network → Offline | Estado sin conexión y mensaje visible | Pendiente |
| Network → No throttling | API vuelve a responder y se genera un evento de cola lista | Pendiente |
| Mantener API apagada, frontend abierto | Mensaje Servidor no disponible | Pendiente |
| Volver a iniciar API | Estado conectado y nuevo evento de cola lista | Pendiente |
| Repetir comprobación con API disponible | No se duplican eventos de reconexión | Pendiente |
| IndexedDB → pending-operations | No cambian registros ni estados por reconectar | Pendiente |
| Build TypeScript/Vite | Sin errores | Pendiente |

## Dependencias para sincronización real

Cuando exista el endpoint autorizado e idempotente por ID de operación, otro issue implementará un consumidor de `subscribeConnectionRecovery()` o de `viviendas-leon:sync-ready`, con envío/reintentos controlados, confirmación del servidor, límites de intentos y autorización. **No debe ejecutarse automáticamente `processQueueOperation` con respuestas simuladas.**

La caché con datos personales y la cola real quedan sujetas a autenticación, permisos, aislamiento por usuario y políticas de eliminación de datos locales.
