# NTF-07 — Alertas de compromisos y seguimientos pendientes (#176)

## Alcance

- Registra **aviso_seguimiento** separado de las alertas operativas y de recordatorios de calendario.
- Programa dos tipos diferenciados para los compromisos de VIS-04 con fecha límite y estado `PENDIENTE` o `NO_CUMPLIDO`:
  - `PROXIMO`: **un día antes** de la fecha límite, a las 08:00 (Guatemala).
  - `VENCIDO`: **el día siguiente** de la fecha límite, a las 08:00 (Guatemala).
- Los compromisos sin fecha no generan avisos de vencimiento.
- Los avisos se envían al **técnico responsable de la visita original**. En los compromisos marcados como `Familia`, se indica al técnico que debe verificar el cumplimiento; no se envían notificaciones a cuentas de beneficiarios.
- Solo se envían a usuarios activos con permisos para consultar la agenda y la API de visitas, o a perfiles institucionales autorizados.
- Una notificación enlaza directamente a `/visitas/agenda?seguimiento=<UUID>`, que abre el detalle del compromiso y conserva las reglas existentes para editarlo.
- Se programan y cancelan avisos en la misma transacción que crea, resuelve o modifica un compromiso, incluidas las operaciones offline sincronizadas con un `operationId`.
- Un trabajador del backend procesa cada 60 segundos; al iniciar y después cada 10 ciclos reconcilia seguimientos previos para crear sus avisos sin duplicados.
- Cada aviso y notificación tiene una clave única y el despacho se ejecuta bajo `FOR UPDATE SKIP LOCKED`; permite dos instancias concurrentes sin envío doble.
- Los avisos enviados se preservan históricamente. Completar un seguimiento o retirar su fecha cancela únicamente los pendientes; editar la fecha vuelve a programar sus avisos correctos.
- Tras errores transitorios se conserva un diagnóstico en `ultimo_error` y se reintenta con backoff exponencial hasta 5 intentos (después queda `ERROR`).

## Corrección solicitada en Recordatorios

Los formularios de calendario institucional y programación de visitas muestran únicamente **tres casillas**:

1. 2 días antes (08:00)
2. 1 día antes (08:00)
3. El mismo día (08:00)

La selección predeterminada para **nuevos** eventos y visitas es `1 día antes`. Si se desmarcan todas, no se crean recordatorios. Se retiraron **“Utilizar las preferencias de cada participante”** y **“Fecha y hora personalizada”** de los formularios. Los registros antiguos que ya contienen recordatorios personalizados no se eliminan automáticamente; al guardar nuevamente un evento, el formulario guarda solo las tres reglas permitidas. Los endpoints existentes de preferencias se conservan para compatibilidad con eventos antiguos.

## Instalación

Coloca `NTF-07-cambios.patch` en la raíz del repositorio y ejecútalo en tu rama:

```bash
git status
git apply --check NTF-07-cambios.patch
git apply NTF-07-cambios.patch
cd apps/api
npx prisma migrate deploy --config prisma7.config.ts
npx prisma generate --config prisma7.config.ts
cd ../..
npm run build
node --test apps/api/tests/followup-alerts.test.mjs
npm run dev
```

El procesador arranca con `apps/api/src/server.ts`. Para desactivarlo temporalmente en desarrollo, coloca `NTF_FOLLOWUP_WORKER_ENABLED=false` en `apps/api/.env`. **No desactiva NTF-05**.

## Consultas SQL para pruebas

```sql
SELECT s.id, s.estado, s.responsable, s.fecha_limite, v.usuario_responsable_id
FROM visita_seguimiento AS s
JOIN visita AS v ON v.id = s.visita_origen_id
ORDER BY s.creado_en DESC LIMIT 20;

SELECT id, seguimiento_id, usuario_id, tipo, fecha_limite,
       fecha_programada, estado, intentos, proximo_intento, ultimo_error
FROM aviso_seguimiento ORDER BY id DESC LIMIT 30;

SELECT id, usuario_id, tipo, titulo, referencia, clave_evento, fecha_creacion
FROM notificacion WHERE tipo IN ('COMPROMISO_PROXIMO', 'COMPROMISO_VENCIDO')
ORDER BY id DESC LIMIT 30;
```

**Para probar sin esperar:** en una base de desarrollo, crea un compromiso con fecha límite **mañana**; su aviso `PROXIMO` tendrá fecha de hoy a las 8 a. m. Si ya pasó esa hora, el siguiente ciclo podrá generarlo. Para comprobar `VENCIDO`, utiliza un compromiso pendiente cuya fecha límite fue **ayer**. No modifiques manualmente `fecha_programada` en producción.

## Checklist de aceptación

- [ ] Un compromiso con responsable de visita activo genera su aviso `PROXIMO` un día antes.
- [ ] Un compromiso de `Familia` se notifica al técnico responsable como tarea de revisión.
- [ ] Un compromiso vencido genera un aviso diferente y distinguible.
- [ ] Sin fecha límite no aparecen avisos.
- [ ] Un compromiso `CUMPLIDO` deja sus avisos futuros en `CANCELADO`.
- [ ] Cambiar la fecha límite cancela los pendientes obsoletos y programa los correctos.
- [ ] Las operaciones offline reintentadas no producen avisos repetidos.
- [ ] Dos ciclos o instancias de procesamiento no generan la misma notificación dos veces.
- [ ] Un usuario inactivo o sin acceso a Visitas no recibe el aviso.
- [ ] Desde la notificación se abre el seguimiento original con sus permisos vigentes.
- [ ] Al reiniciar la API se recuperan los avisos pendientes.
- [ ] Los errores quedan registrados y los reintentos no se reinician por la reconciliación.
- [ ] Los formularios de recordatorios muestran únicamente las tres opciones acordadas.

**Nota de validación:** las pruebas unitarias de lógica y backend simulado no sustituyen una prueba de integración real con PostgreSQL y el cliente Prisma recién generado.
