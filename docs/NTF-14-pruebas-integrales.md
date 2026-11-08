# NTF-14 — Pruebas integrales, permisos y validación de notificaciones

**Issue:** #183
**Rama:** `feature/ntf-14-pruebas-integrales`
**Proyecto:** Viviendas León

## 1. Objetivo

Verificar el funcionamiento del sistema de notificaciones, recordatorios y alertas de Viviendas León, comprobando el cumplimiento de los permisos institucionales, la comunicación entre frontend y backend, la persistencia en PostgreSQL y la prevención de registros duplicados.

## 2. Pruebas automatizadas

Se ejecutaron 127 casos de prueba relacionados con notificaciones, recordatorios, alertas, permisos, Web Push, WhatsApp, calendario institucional y agenda de visitas.

**Resultados:**

- Pruebas ejecutadas: 127.
- Pruebas aprobadas: 127.
- Pruebas fallidas: 0.

Estas comprobaciones incluyen reglas de autorización, destinatarios, validaciones, programación de recordatorios, reintentos simulados y restricciones de navegación.

## 3. Pruebas integrales y funcionales

Se realizaron comprobaciones mediante Brave, Google Chrome, la API Express y PostgreSQL.

| Funcionalidad | Resultado |
|---|---|
| Consulta de notificaciones autenticadas | Aprobado |
| Protección de endpoints sin sesión | Aprobado |
| Verificación de permisos de cinco roles | Aprobado |
| Restricción de acceso a notificaciones ajenas | Aprobado |
| Marcado individual y masivo como leído | Aprobado |
| Recepción real de Web Push en Chrome | Aprobado |
| Creación de actividades y generación de avisos | Aprobado |
| Modificación de actividades y generación de avisos | Aprobado |
| Cancelación de actividades y generación de avisos | Aprobado |
| Recuperación de consultas tras desconexión | Aprobado |
| Visualización en modo oscuro | Aprobado |
| Adaptación del panel a vista móvil | Aprobado |

## 4. Verificación de PostgreSQL

Se verificaron registros reales en las tablas de notificaciones y recordatorios.

**Recordatorios enviados:**

- `REM:8`: notificación ID 1008.
- `REM:9`: notificación ID 1009.

Ambos recordatorios tienen una única notificación registrada con su correspondiente clave de evento.

**Visitas vencidas:**

Se encontraron cuatro notificaciones de tipo `VISITA_VENCIDA` con claves de evento distintas.

**Prevención de duplicados:**

Se ejecutó una consulta SQL sobre las claves de evento no nulas y no se encontraron valores repetidos.

**Errores de procesamiento:**

La consulta de recordatorios con estado `ERROR`, errores registrados o más de un intento no devolvió resultados.

Estos resultados describen el estado observado de la base de datos y no sustituyen pruebas de concurrencia o fallos provocados.

## 5. Conclusión

Las pruebas realizadas demuestran el funcionamiento satisfactorio de los principales componentes del sistema de notificaciones, incluyendo permisos institucionales, recepción Web Push, recordatorios almacenados, alertas de visitas vencidas, operaciones de calendario y recuperación de consultas después de una desconexión.

Las 127 pruebas automatizadas ejecutadas finalizaron sin fallos.

No se identificaron errores críticos en los escenarios comprobados. Sin embargo, las comprobaciones integrales pendientes deben completarse o registrarse expresamente como limitaciones antes de declarar todos los criterios de aceptación totalmente validados.