# NTF-08 — Alertas automáticas de visitas vencidas (#177)

## Alcance

- Una visita está **vencida** solamente cuando `estado = PROGRAMADA` y su fecha civil `@db.Date` es anterior al día actual en `America/Guatemala`.
- No se modifica su estado a `NO_CUMPLIO`, `CANCELADA` ni `REALIZADA` automáticamente: «No cumplió» requiere verificación y registro humano.
- El backend revisa las visitas al arrancar y después cada **60 segundos**; no depende de la PWA ni de que alguien tenga una sesión abierta.
- Crea una notificación interna para el técnico responsable y para los usuarios de Dirección general y Coordinación, siempre que estén activos y tengan autorización para consultar Visitas.
- La clave única `VISV:<visita_id>:<fecha>:<usuario_id>` y el índice único de `notificacion.clave_evento` protegen de duplicados incluso con dos procesos y después de reinicios.
- En el dashboard «Mi agenda», el técnico ve únicamente sus pendientes. Dirección y Coordinación ven adicionalmente «Visitas vencidas del equipo», con contador global y las primeras 12 en orden de fecha (más antiguas primero).
- Si una visita se realiza mediante la sincronización, se reprograma o se elimina desde la agenda, sus notificaciones de vencimiento **no leídas** se marcan leídas dentro de la operación existente. El historial leído se conserva.
- Los avisos no convierten visitas vencidas en compromisos; VIS-04 y NTF-07 siguen operando por separado.
- No se requiere migración: se reutiliza `notificacion.clave_evento`, ya existente desde NTF-03.

## Instalación en la rama de NTF-08

Desde la raíz del repositorio:

```sh
git status
git apply --check NTF-08-cambios.patch
git apply NTF-08-cambios.patch
npm run build
node --test apps/api/tests/overdue-visits.test.mjs
node --test apps/api/tests/my-agenda.test.mjs
npm run dev
```

Si Prisma aún requiere regeneración después de las historias anteriores:

```sh
cd apps/api
npx prisma generate --config prisma7.config.ts
cd ../..
```

Desactivar únicamente el procesador NTF-08 en desarrollo:

```env
NTF_OVERDUE_VISITS_ENABLED=false
```

## Verificación manual (base de datos local de pruebas)

1. Inicia sesión con un técnico, y abre otra sesión con Dirección o Coordinación.
2. Programa una visita a nombre del técnico **para ayer** (si el formulario impide fechas pasadas, en una copia de base de pruebas reprograma la fecha con SQL). Mantén `estado = PROGRAMADA`.
3. Reinicia la API o espera como máximo un ciclo de 60 segundos. Aparecerá **una** notificación del tipo `VISITA_VENCIDA` para el técnico y para cada supervisor autorizado.
4. Refresca «Mi agenda». El técnico la verá en «Mis pendientes» y los supervisores en «Visitas vencidas del equipo».
5. Reinicia la API. Las notificaciones ya creadas no se duplican.
6. Reprograma la visita a una fecha futura; verifica que sale de la lista de vencidas y sus avisos no leídos dejan de contarse. Repite el flujo marcándola como realizada.
7. Comprueba que una visita marcada previamente `REALIZADA` o con fecha **de hoy** no genera alertas.
8. Inicia sesión con un usuario sin permisos de visitas: no debe ver la lista de supervisión ni recibir avisos de una visita ajena.

SQL de consulta seguro (no modifica datos):

```sql
SELECT v.id, v.fecha, v.estado, v.usuario_responsable_id
FROM visita v
WHERE v.estado = 'PROGRAMADA'
  AND v.fecha < (NOW() AT TIME ZONE 'America/Guatemala')::date
ORDER BY v.fecha ASC;

SELECT id, usuario_id, tipo, titulo, clave_evento, fecha_lectura
FROM notificacion
WHERE tipo = 'VISITA_VENCIDA'
ORDER BY id DESC LIMIT 30;
```

Para comprobar duplicados:

```sql
SELECT clave_evento, COUNT(*)
FROM notificacion WHERE tipo = 'VISITA_VENCIDA'
GROUP BY clave_evento HAVING COUNT(*) > 1;
```

El resultado debe ser vacío.

## Limitaciones y comportamiento esperado

- Son **notificaciones internas** visibles en la campana cuando el usuario abre la PWA. No son push en el dispositivo: eso corresponde a NTF-11/12.
- El procesador usa una consulta paginada por lotes de 200 y retoma operaciones fallidas en el siguiente ciclo; los errores se registran en logs bajo `[NTF-08]`.
- Un aviso vencido que ya fue leído permanece en el historial, incluso si la visita se reprograma, para conservar trazabilidad.
- La compilación del backend necesita el cliente Prisma generado para las migraciones NTF-04 a NTF-07 en el entorno local.
