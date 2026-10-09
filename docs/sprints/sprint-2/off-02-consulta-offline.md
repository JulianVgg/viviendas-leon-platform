# OFF-02 — Consulta de información esencial sin conexión

**Issue:** #68

## 1. Objetivo

Implementar la infraestructura necesaria para consultar información previamente almacenada en el dispositivo cuando no exista conexión a Internet, aprovechando la configuración PWA desarrollada en OFF-01.

## 2. Implementación realizada

- Implementación de almacenamiento persistente mediante IndexedDB.
- Creación de un servicio reutilizable para obtener información remota y almacenar una copia local.
- Recuperación de la última copia disponible cuando no existe conexión.
- Detección automática del estado de conectividad mediante un hook de React.
- Indicador visual de conexión en el encabezado.
- Manejo de errores cuando no existe información almacenada.
- Pantalla técnica de validación con información ficticia, disponible solamente en desarrollo.

La implementación de OFF-02 se limita a consultas de lectura. No incluye creación, modificación, eliminación ni sincronización de operaciones pendientes.

## 3. Archivos principales

| Archivo | Responsabilidad |
|---|---|
| `src/db/offlineDb.ts` | Persistencia en IndexedDB |
| `src/services/offlineService.ts` | Consulta remota y recuperación de caché |
| `src/hooks/useOnlineStatus.ts` | Detección de conectividad |
| `src/components/ui/SyncStatus.tsx` | Indicador visual |
| `src/app/layout/AppHeader.tsx` | Integración del indicador |
| `src/features/offline/pages/OfflineTestPage.tsx` | Validación técnica |

Las rutas indicadas son relativas a `apps/web/`.

## 4. Pruebas realizadas

- [x] Compilación del frontend.
- [x] Almacenamiento de registros de prueba en IndexedDB.
- [x] Recuperación de registros sin conexión.
- [x] Visualización del estado de conexión.
- [x] Service Worker activo en la versión de producción.
- [x] Recarga de la PWA sin conexión con recursos previamente almacenados.
- [x] Consulta offline después de recargar la aplicación.
- [x] Sin errores críticos observados durante las pruebas anteriores.
- [ ] Integración con información real proveniente de la API.
- [ ] Validación de acceso y protección de información de beneficiarios.
- [ ] Prueba de ausencia de caché y manejo de mensaje informativo.

## 5. Estado de criterios de aceptación

| Criterio | Estado |
|---|---|
| Los datos esenciales permanecen disponibles offline | Validado técnicamente con datos ficticios; pendiente integración real |
| La interfaz informa el estado de conexión | Implementado y probado |
| La ausencia de Internet no provoca errores críticos | Validado en los escenarios de prueba ejecutados |

## 6. Dependencia: FAM-01

La integración del listado real de familias queda pendiente de la implementación del módulo de familias y su endpoint de consulta.

Cuando la API esté disponible, deberá integrarse con el servicio `getEssentialData()` y mostrar la información previamente almacenada durante una desconexión.

Esta integración deberá utilizar la respuesta real de la API, sin almacenar los registros ficticios empleados en las pruebas.

## 7. Seguridad

Antes de almacenar información personal de beneficiarios, deberán definirse y aplicarse:

- Autenticación y autorización para consultar datos.
- Separación de información local por usuario o ámbito autorizado.
- Eliminación de información almacenada al cerrar sesión o revocarse el acceso, según la política definida.
- Manejo seguro de sesiones offline.
- Limitación de los campos personales almacenados.

No se almacenarán datos personales reales en esta etapa de validación técnica.

## 8. Estado de entrega

Infraestructura de consulta offline implementada y validada técnicamente.

La aceptación funcional completa queda condicionada a integrar y probar un módulo con información real autorizada.