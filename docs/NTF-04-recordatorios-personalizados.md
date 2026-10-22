# NTF-04 — Configuración de recordatorios personalizados (#173)

## Alcance

Esta historia **configura y persiste** recordatorios. El envío automático cuando llega su fecha corresponde a **NTF-05**; no hay cron jobs, Web Push, correo ni WhatsApp en NTF-04.

### Base de datos

Migración: `apps/api/prisma/migrations/20261021200000_ntf04_recordatorios/migration.sql`.

- `recordatorio`: un recordatorio por usuario, tipo de actividad, actividad y regla/fecha. Estados: `PENDIENTE`, `CANCELADO`, `ENVIADO` (este último reservado para NTF-05). Índices para consultas por fecha y estado. No contiene información confidencial de la visita.
- `preferencia_recordatorio`: preferencias generales individuales con arreglo de anticipaciones válidas. Si no hay fila, el valor predeterminado es `DIA_ANTES`.
- `evento_institucional.recordatorios_config` y `visita.recordatorios_config`: configuración explícita del evento (JSONB). `NULL` significa que cada destinatario usa sus propias preferencias; `[]` significa recordatorios desactivados; una lista contiene las reglas comunes explícitas.
- La relación con eventos/visitas es lógica (`tipo_origen`, `origen_id`): las operaciones de cancelación eliminan la elegibilidad de los recordatorios mediante su cambio a `CANCELADO`, preservando el registro auditable.

### Opciones de recordatorio

- `DOS_DIAS_ANTES` — dos días antes a las 08:00 de Guatemala.
- `DIA_ANTES` — un día antes a las 08:00.
- `MISMO_DIA` — el mismo día a las 08:00.
- `PERSONALIZADO` — fecha y hora local `AAAA-MM-DDTHH:mm`, que no puede ser posterior a la fecha de la actividad.

El calendario y la agenda técnica actuales no tienen una hora exacta de inicio (la agenda solo utiliza mañana/tarde), por lo que **no se ofrece "2 horas antes"**. Las fechas se interpretan explícitamente en UTC-06 (Guatemala) sin depender de la zona del servidor. Se ignoran recordatorios cuya fecha programada ya pasó, por ejemplo tras sincronizar tardíamente una visita offline. No se generan avisos retroactivos.

### API

- `GET /api/v1/recordatorios/preferencias` — devuelve `{ "anticipaciones": ["DIA_ANTES"] }` por sesión.
- `PUT /api/v1/recordatorios/preferencias` — recibe `{ "anticipaciones": ["DIA_ANTES", "MISMO_DIA"] }`, requiere sesión y `X-Requested-With: XMLHttpRequest`, valida lista sin duplicados.
- El POST/PUT de `/api/v1/calendario` acepta `recordatorios` (lista o null) y los GET del calendario también devuelven este campo.
- La captura de una visita `PROGRAMADA` admite `recordatorios` en `payload` de `/api/v1/visitas/sync`; así se conserva dentro de la operación de IndexedDB en espera de sincronización.
- Los roles de creación/edición de calendarios y visitas siguen siendo los actuales. Solo se programan recordatorios a destinatarios activos que disponen del permiso de consulta del módulo.

Ejemplo de configuración explícita en un evento:

```json
{
  "categoria": "CAPACITACION",
  "titulo": "Capacitación",
  "descripcion": "",
  "fechaInicio": "2026-11-15",
  "participantesIds": [2, 4],
  "recordatorios": [
    { "tipo": "DIA_ANTES" },
    { "tipo": "MISMO_DIA" },
    { "tipo": "PERSONALIZADO", "fechaHora": "2026-11-14T16:30" }
  ]
}
```

### Interfaz

- Formulario **Calendario > Crear/Editar evento**: selección múltiple, fecha personalizada, o preferencias personales predeterminadas.
- **Visitas técnicas > Agendar visita**: mismo selector; la información viaja en IndexedDB hasta su sincronización.
- **Notificaciones > Mis preferencias de recordatorios**: cada usuario configura sus anticipaciones generales. Las preferencias nuevas se aplican a actividades creadas o editadas posteriormente, no reprograman todas las actividades históricas.

### Reglas transaccionales

- Creación: la fila del evento/visita y sus recordatorios pendientes se confirman en una misma transacción.
- Edición: los recordatorios pendientes anteriores se cancelan y se calculan según la nueva fecha y/o los nuevos participantes, sin modificar los que se hubiesen enviado.
- Eliminación o realización de una visita programada: se cancelan los pendientes. Las capturas offline antiguas continúan siendo válidas, conservando su hash de sincronización.
- Reintentos de un mismo `X-Operation-Id` de eventos y `operationId` de visitas siguen siendo idempotentes, y el esquema incorpora una restricción única por destinatario, actividad y regla/fecha.

### Ejecutar

Desde `apps/api`:

```bash
npx prisma migrate deploy --config prisma7.config.ts
npx prisma generate --config prisma7.config.ts
```

Desde la raíz:

```bash
npm run build
node --test apps/api/tests/reminders.rules.test.mjs
npm run dev
```

Verificación SQL:

```sql
SELECT id, usuario_id, tipo_origen, origen_id, clave, fecha_programada, estado
FROM recordatorio ORDER BY id DESC LIMIT 30;

SELECT usuario_id, anticipaciones FROM preferencia_recordatorio;
```

### Checklist manual

- [ ] Una cuenta sin permisos institucionales no crea/edita eventos.
- [ ] Guardar un evento con dos participantes crea recordatorios de cada participante autorizado.
- [ ] Si un participante configura otro valor predeterminado, su recordatorio respeta sus preferencias.
- [ ] Seleccionar 1 día antes y mismo día crea dos recordatorios por participante.
- [ ] Seleccionar una fecha personalizada válida guarda su fecha/hora correctamente en UTC.
- [ ] Fecha personalizada posterior al evento o una regla repetida produce HTTP 400.
- [ ] Repetir el POST con el mismo UUID no añade recordatorios.
- [ ] Editar la fecha actualiza los pendientes; quitar a alguien cancela los suyos.
- [ ] Borrar el evento cancela sus recordatorios pendientes.
- [ ] Programar una visita offline conserva su configuración hasta sincronizar.
- [ ] Reintentar la sincronización no duplica recordatorios.
- [ ] Reprogramar o cancelar una visita actualiza/cancela sus pendientes.
- [ ] Registrar una visita previamente programada cancela los pendientes de esa cita.
- [ ] Una actividad sin hora exacta no ofrece recordatorios por horas.
- [ ] Cambiar las preferencias personales no modifica las de otros usuarios.

### Limitación de validación en este entorno

Las reglas puras pasaron sus pruebas y el frontend pasó TypeScript. Se intentó ejecutar Prisma Generate en Linux, pero la copia recibida incluye motores nativos para Windows y no hubo conectividad al servicio de binarios de Prisma. Por lo tanto, el `build` del backend con tipos recién generados y la migración contra PostgreSQL se deben ejecutar en Windows. No se ha ejecutado un servidor de base de datos aquí.
