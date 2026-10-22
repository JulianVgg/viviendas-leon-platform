# NTF-05 — Procesamiento automático de recordatorios (#174)

## Objetivo y alcance
Procesar, en backend y sin sesión de usuario, los recordatorios creados por NTF-04. Al vencer cada hora programada, registrar **una notificación interna** en `notificacion` y marcar el recordatorio `ENVIADO` de forma atómica. Este issue **no incluye push al teléfono** ni envío de WhatsApp: la PWA consulta las notificaciones con la API de NTF-01/02.

## Diseño técnico
- Inicio: `apps/api/src/server.ts`, *después* de abrir el servidor Express.
- Proceso: `apps/api/src/modules/notifications/reminders.worker.ts`.
- Revisión inmediata al arrancar y luego cada **60 segundos** (`setInterval`, con `unref()` para no bloquear el apagado).
- Hasta **50 recordatorios por ciclo**; los restantes se procesan en la próxima revisión.
- Los timestamps en PostgreSQL se almacenan como `TIMESTAMPTZ`: se comparan contra `NOW()` en UTC, sin depender de la zona horaria del host. Las fechas «mismo día»/«día antes» se calculan en UTC-6 en NTF-04 (08:00 de Guatemala => 14:00Z).
- **Concurrencia:** la transacción bloquea una fila `PENDIENTE` con `FOR UPDATE SKIP LOCKED`. Dos instancias pueden coexistir, pero no procesan simultáneamente el mismo recordatorio.
- **Idempotencia:** `notificacion.clave_evento` recibe `REM:<id_recordatorio>`, que ya es `UNIQUE` desde NTF-03. `createMany(... skipDuplicates: true)` y `recordatorio.estado = ENVIADO` se confirman en la misma transacción.
- **Vigencia:** antes de emitir, se vuelve a consultar el usuario activo, su permiso institucional, la participación en el evento / responsabilidad de visita y el estado `PROGRAMADA` de la visita. Si ya no aplica, queda `CANCELADO` y no emite notificación.
- **Reintentos:** los fallos se registran en `ultimo_error` y `intentos`; se reprograman con backoff 1, 2, 4 y 8 minutos; el quinto fallo deja `ERROR` para diagnóstico. Si PostgreSQL no está disponible, se informa por consola y se vuelve a comprobar en la próxima ronda.
- **Persistencia:** `intentos`, `proximo_intento`, `ultimo_error`, `procesado_en` se agregan con una migración incremental, sin borrar recordatorios anteriores.
- **Control:** `NTF_REMINDERS_WORKER_ENABLED=false` desactiva el procesador de esta instancia. Útil si se decide ejecutar únicamente en una réplica. Por defecto, está **activo**.

### Estados

| Estado | Significado |
|---|---|
| `PENDIENTE` | Aún no se ha despachado; `proximo_intento` controla reintentos |
| `ENVIADO` | Notificación interna confirmada en la misma transacción |
| `CANCELADO` | Actividad modificada/cancelada o destinatario no elegible |
| `ERROR` | Cinco intentos fallidos: requiere investigación manual |

## Instalación en Windows (Git Bash, raíz del repositorio)

1. Trabajar en la rama `issue-NTF-05-procesamiento-automatico-recordatorios` (o nombre equivalente).
2. Aplicar el parche desde la raíz:

```bash
git status
git apply --check NTF-05-cambios.patch
git apply NTF-05-cambios.patch
```

3. Aplicar migración y regenerar cliente Prisma:

```bash
cd apps/api
npx prisma migrate deploy --config prisma7.config.ts
npx prisma generate --config prisma7.config.ts
cd ../..
```

4. Construir y ejecutar pruebas:

```bash
npm run build
node --test apps/api/tests/reminders.rules.test.mjs apps/api/tests/reminders.worker.test.mjs
npm run dev
```

> Si falta `DATABASE_URL` o PostgreSQL no está levantado, iniciar `viviendas-leon-postgres` y comprobar `apps/api/.env` antes del `migrate deploy`. Esta migración depende de la migración de NTF-04.

## Verificación manual con datos locales

En una base de datos de desarrollo, crea previamente un evento con participante y recordatorio en el calendario, o una visita programada con responsable válido. Identifica el recordatorio:

```bash
docker exec -it viviendas-leon-postgres psql -U viviendas_leon -d viviendas_leon
```

```sql
SELECT id, usuario_id, tipo_origen, origen_id, clave, fecha_programada,
       estado, intentos, proximo_intento, procesado_en, ultimo_error
FROM recordatorio
ORDER BY id DESC LIMIT 20;
```

**Solo en tu base local de pruebas**, fuerza que un recordatorio pendiente sea procesable (reemplaza el número 123 por un ID real de una actividad vigente):

```sql
UPDATE recordatorio
SET fecha_programada = NOW() - INTERVAL '1 minute',
    estado = 'PENDIENTE', proximo_intento = NULL
WHERE id = 123 AND estado = 'PENDIENTE';
```

Tras arrancar `npm run dev`, busca el log `[NTF-05] Lote` y comprueba:

```sql
SELECT r.id, r.estado, r.intentos, r.procesado_en,
       n.id AS notificacion_id, n.clave_evento, n.titulo, n.referencia
FROM recordatorio r
LEFT JOIN notificacion n ON n.clave_evento = 'REM:' || r.id::text
WHERE r.id = 123;
```

La campanita de la cuenta destinataria debe mostrar la notificación. Reinicia `npm run dev` y verifica que **sigue habiendo una sola notificación** para ese ID. No uses un ID enviado a producción para forzar pruebas. Si la actividad fue eliminada, el usuario perdió permisos, se retiró al participante, o la visita dejó de estar `PROGRAMADA`, debe quedar `CANCELADO` sin notificación.

Para identificar errores terminales:

```sql
SELECT id, usuario_id, tipo_origen, origen_id, intentos, ultimo_error
FROM recordatorio WHERE estado = 'ERROR'
ORDER BY id DESC;
```

## Checklist de aceptación

- [ ] El proceso se inicia junto con el backend y continúa sin usuarios conectados.
- [ ] Detecta recordatorios que llegaron a la hora programada (incluida hora local de Guatemala).
- [ ] Inserta una sola fila de notificación por recordatorio.
- [ ] Marca `ENVIADO` y registra `procesado_en`.
- [ ] Dos instancias no procesan a la vez la misma fila (prueba con PostgreSQL real).
- [ ] Reiniciar servidor no duplica ni pierde los pendientes.
- [ ] Modificar o cancelar evento elimina pendientes antiguos antes de despacharlos.
- [ ] Una visita ya realizada/cancelada no genera avisos de visita programada.
- [ ] Usuario inactivo, desasignado o sin acceso no recibe avisos.
- [ ] Error transitorio crea un nuevo intento sin romper el proceso general.
- [ ] Cinco fallos guardan `ERROR` y un mensaje de diagnóstico.
- [ ] `NTF_REMINDERS_WORKER_ENABLED=false` desactiva el despachador.
- [ ] Los avisos son **internos**; notificaciones push corresponden a NTF-11/12.

## Pruebas automatizadas

`apps/api/tests/reminders.worker.test.mjs` cubre reintentos, reglas de mensaje, envío único, idempotencia, revocación de acceso, cambios de asistentes, visitas no válidas y el estado final de error. Conservar las 8 pruebas previas de `reminders.rules.test.mjs` de NTF-04.

**Limitación de validación:** los tests utilizan dobles transaccionales; no prueban los bloqueos reales de PostgreSQL. Esa parte requiere la base local y la prueba de dos instancias, además de regenerar Prisma después de la migración.
