# Visitas técnicas — Integración operativa (Agenda, Registro, Historial)

## Alcance entregado

- Navegación: se oculta el enlace redundante «Vista general» solamente dentro de «Visitas técnicas»; las rutas anteriores de `/actividades/visitas` redirigen a la agenda.
- Agenda mensual/semanal de estilo TailAdmin, con días seleccionables, visitas registradas y próximas visitas programadas. Su presentación se adaptó de los patrones visuales de TailAdmin Pro; no se copió directamente FullCalendar ni se añadieron dependencias.
- Registro progresivo de tres pasos, fecha local del dispositivo, datos de familias desde API (copia local por usuario), cultivos y hallazgos opcionales, producción, compromisos con responsables Familia/ONG y observaciones.
- Dos casillas de audio presentes pero **no funcionales**; su futura implementación requiere permisos, Blob storage, cifrado y sincronización de archivos.
- Guardado: siempre se inserta primero una operación durable `visits.create.v1` en IndexedDB; con API disponible se envía a `/api/v1/visitas/sync` y el servidor responde con acuse por UUID. Sin conexión, la operación queda pendiente. Al recuperar conectividad OFF-05 activa reintento específico de visitas.
- API Express autenticada y protegida por permisos de visitas; las consultas se limitan al técnico autenticado. El usuario responsable se obtiene de sesión, no del payload del cliente.
- Persistencia: registro básico en la tabla existente `visita` y captura estructurada JSONB en la nueva `visita_captura`, mediante transacción con UUID único e integridad referencial. `VisitaCaptura` almacena datos agrícolas, recomendaciones y compromisos sin forzar asociaciones ficticias con ciclos de cultivo.
- El historial combina filas del servidor, copias locales por usuario y operaciones en cola del propio usuario. Los pendientes y errores no se etiquetan como sincronizados.

## Archivos modificados / nuevos

- `apps/web/src/app/navigation/navigation.tsx`
- `apps/web/src/app/layout/AppSidebar.tsx`
- `apps/web/src/app/routes.tsx`
- `apps/web/src/app/layout/ConnectivitySyncBridge.tsx`
- `apps/web/src/features/visits/pages/VisitAgendaPage.tsx`
- `apps/web/src/features/visits/pages/VisitRegisterPage.tsx`
- `apps/web/src/features/visits/pages/VisitHistoryPage.tsx`
- `apps/web/src/features/visits/services/visitService.ts` (nuevo)
- `apps/api/src/app.ts`
- `apps/api/src/modules/visits/visits.routes.ts` (nuevo)
- `apps/api/prisma/schema.prisma`
- `apps/api/prisma/migrations/20261015120000_visita_captura/migration.sql` (nuevo)

## Aplicación de migración (solo BD de desarrollo hasta QA)

Desde `apps/api`, después de guardar respaldo de PostgreSQL y revisar la migración:

```powershell
npx prisma migrate status --config prisma7.config.ts
npx prisma migrate deploy --config prisma7.config.ts
npx prisma generate --config prisma7.config.ts
```

No ejecutar `prisma migrate reset`, ni `db push --force-reset`, ni volver a ejecutar el seed para aplicar esta funcionalidad.

## Casos mínimos de aceptación

1. Iniciar sesión con un usuario que tenga permiso `SYN-VISITAS-WRITE` o `VISITAS_WRITE`.
2. Ver las familias que ya existen en PostgreSQL y fecha local actual en `/visitas/nueva`.
3. Seleccionar familia, agregar cultivo, plaga y compromisos; guardar visita. Network debe mostrar POST `/api/v1/visitas/sync` HTTP 201 y respuesta `accepted:true`.
4. Ver la visita en el historial y confirmar en PostgreSQL una fila en `visita` y otra en `visita_captura` referenciada. La agenda debe mostrar las programadas en su fecha.
5. Repetir la misma solicitud HTTP usando el mismo UUID y payload; API debe devolver `duplicate:true` sin crear otra fila.
6. Con Network en Offline, registrar otra visita: debe aparecer como pendiente en Historial, persistir después de recargar mientras la sesión React siga activa y sincronizarse al recuperar la API.
7. Forzar error temporal del servidor: la operación debe permanecer en IndexedDB con `status:failed`; al reintentar, el UUID no cambia y solo se inserta una visita.
8. Sin permiso adecuado, el endpoint debe devolver 403; sin sesión, 401.
9. Revisar interfaz móvil (ancho 360 px) y modo oscuro.

Consulta PostgreSQL para inspección:

```sql
SELECT v.id, v.familia_id, v.fecha, v.estado, vc.operation_id, vc.creado_en
FROM visita v
JOIN visita_captura vc ON vc.visita_id = v.id
ORDER BY vc.creado_en DESC;
```

## Límites pendientes antes de uso real en campo

- El detalle agrícola y los compromisos se conservan como **captura JSONB**. La vinculación a `CicloCultivo`, `EvaluacionCultivo`, `RegistroProduccion`, `SeguimientoTecnico` y otros modelos normalizados requiere reglas de negocio y validación agronómica antes de generar reportes de producción oficiales.
- Los audios, transcripciones y envío por WhatsApp aún no están implementados.
- El control actual de sesión exige conexión al iniciar o recargar toda la aplicación. El flujo offline en página abierta funciona; para permitir apertura desde cero sin red hace falta diseñar autenticación offline segura, además de cifrado/aislamiento de datos locales en dispositivos compartidos.
- El listado actual devuelve únicamente las visitas del usuario activo, no la agenda global de todos los técnicos.
- Las notas y datos locales se guardan en IndexedDB del navegador sin cifrado de aplicación. En esta fase usar datos sintéticos en un equipo de confianza; no habilitar la captura de datos sensibles reales ni desplegar en producción sin completar medidas de protección, política de retención y recuperación de dispositivos.
- La confirmación de guardado online depende de que el backend aplique esta nueva migración. No se cambian ni se sincronizan las operaciones ficticias `demo.field-note.create` de OFF-06.

## Observaciones de pruebas en el entorno de preparación

- TypeScript de API y frontend: comprobación estática realizada sobre el código extraído del ZIP del proyecto.
- El build de Vite completo no pudo comprobarse aquí: el `node_modules` compartido contiene módulos nativos de Windows y el entorno de revisión es Linux. Ejecutarlo en el equipo de desarrollo.
- Prisma Client debe regenerarse en el equipo de desarrollo después de aplicar la migración; el ambiente de preparación no tiene acceso al motor de Prisma para descargar binarios Linux.
- La base PostgreSQL del equipo de desarrollo no estaba accesible desde este entorno; quedan pendientes las pruebas de integración del endpoint y la sincronización offline.
