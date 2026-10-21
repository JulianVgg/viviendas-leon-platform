# NTF-01 — Persistencia y API de notificaciones

Issue: **#170** · Épica: **#169**

## Alcance

Esta historia incorpora la bandeja de notificaciones individuales al backend. **No** implementa la campanita visual (NTF-02), la creación automática desde calendarios (NTF-03), los recordatorios (NTF-04/05), el envío push (NTF-11/12) ni WhatsApp (NTF-13).

Se crea `notificacion`, independiente de `alerta`, que ya existe para el seguimiento operativo de familias y visitas.

| Campo Prisma | Columna PostgreSQL | Descripción |
|---|---|---|
| `id` | `id` | ID autoincremental |
| `usuarioId` | `usuario_id` | Destinatario, FK hacia `usuario(id)` |
| `tipo` | `tipo` | Categoría (por ejemplo, `SISTEMA` o `CALENDARIO`) |
| `titulo` | `titulo` | Encabezado del aviso |
| `mensaje` | `mensaje` | Texto del aviso |
| `referencia` | `referencia` | Ruta interna opcional de la PWA |
| `fechaCreacion` | `fecha_creacion` | Alta del registro, UTC con zona horaria |
| `fechaLectura` | `fecha_lectura` | `NULL`: no leída; fecha: leída |

Las notificaciones se ordenan por `fechaCreacion DESC, id DESC`; hay índices para consultar por destinatario, fecha y estado de lectura. Los datos no desaparecen al cerrar sesión.

## Instalación local (Git Bash / PowerShell)

Desde la raíz del monorepo, conservando la rama `issue-NTF-01-implementacion-api`:

```bash
cd apps/api
npx prisma migrate deploy --config prisma7.config.ts
npx prisma generate --config prisma7.config.ts
cd ../..
npm run build
node --test apps/api/tests/notifications.validation.test.mjs apps/api/tests/notifications.service.test.mjs
npm run dev
```

> Si `generate` informa que faltan dependencias, primero ejecuta `npm install` desde la raíz. No agregues ni edites manualmente archivos de `src/generated/prisma`: el generador se encarga de actualizarlos. El archivo `apps/api/.env` debe contener `DATABASE_URL` y `SESSION_SECRET` como en los módulos existentes.

## API disponible

Base: `/api/v1/notificaciones`. Todas las operaciones requieren **sesión autenticada** y haber completado el cambio obligatorio de contraseña. El usuario destinatario se determina **exclusivamente de la sesión**; nunca de la URL o del body.

### 1. Listar notificaciones

`GET /api/v1/notificaciones?estado=todas&pagina=1&limite=20`

Parámetros opcionales: `estado` (`todas`, `leidas`, `no_leidas`), `pagina` (1–10000, predeterminado 1), `limite` (1–100, predeterminado 20).

Ejemplo de respuesta:

```json
{
  "notificaciones": [
    {
      "id": 12,
      "tipo": "CALENDARIO",
      "titulo": "Visita programada",
      "mensaje": "Tienes una visita el jueves.",
      "referencia": "/visitas/agenda",
      "fechaCreacion": "2026-10-21T17:30:00.000Z",
      "fechaLectura": null
    }
  ],
  "paginacion": { "pagina": 1, "limite": 20, "total": 1, "totalPaginas": 1 },
  "noLeidas": 1
}
```

### 2. Contar no leídas

`GET /api/v1/notificaciones/contador`

Respuesta: `{ "noLeidas": 1 }`.

### 3. Marcar una notificación como leída

`PATCH /api/v1/notificaciones/12/leer` con encabezado `X-Requested-With: XMLHttpRequest`.

Respuesta: `{ "id": 12, "leida": true, "fechaLectura": "..." }`. Puede invocarse de nuevo sin cambiar la fecha de la primera lectura. Para IDs inexistentes o ajenos se responde **404** sin revelar la existencia del registro.

### 4. Marcar todas las notificaciones propias como leídas

`PATCH /api/v1/notificaciones/leer-todas` con encabezado `X-Requested-With: XMLHttpRequest`.

Respuesta: `{ "actualizadas": 3 }`. No altera avisos de otros usuarios ni modifica fechas existentes.

### Ejemplo rápido desde la consola del navegador

Con la sesión iniciada en la PWA (`localhost:5173`):

```js
// Lista actual.
await (await fetch('/api/v1/notificaciones', { credentials: 'same-origin' })).json()
// Contador.
await (await fetch('/api/v1/notificaciones/contador', { credentials: 'same-origin' })).json()
// Marcar un ID real como leído (cambia 12 por el ID obtenido en el listado).
await (await fetch('/api/v1/notificaciones/12/leer', {
  method: 'PATCH', credentials: 'same-origin',
  headers: { 'X-Requested-With': 'XMLHttpRequest' },
})).json()
// Marcar todas como leídas.
await (await fetch('/api/v1/notificaciones/leer-todas', {
  method: 'PATCH', credentials: 'same-origin',
  headers: { 'X-Requested-With': 'XMLHttpRequest' },
})).json()
```

### Insertar un aviso de prueba (SOLO base local de desarrollo)

Para disponer de registros antes de NTF-03, ejecuta el siguiente SQL en `psql`. **Reemplaza el correo** por el de un usuario real de la base local. La instrucción no crea nada si ese correo no existe:

```sql
INSERT INTO notificacion (usuario_id, tipo, titulo, mensaje, referencia)
SELECT id, 'SISTEMA', 'Prueba NTF-01',
       'Este es un aviso para comprobar la bandeja.', '/calendario'
FROM usuario WHERE correo = 'CORREO_DE_PRUEBA@ejemplo.com'
RETURNING id, usuario_id, fecha_creacion;
```

También existe el método **interno** `crearNotificacion(...)` en `apps/api/src/modules/notifications/notifications.service.ts` para que los módulos de calendario y visitas generen avisos a partir de NTF-03. Se evita publicar un `POST /notificaciones` que permitiría a usuarios crear mensajes arbitrarios para otros.

## Validaciones y seguridad

- Sin iniciar sesión: **401**. Sesión inválida o inactiva: **401**. Cambio de contraseña pendiente: **403**.
- IDs y filtros incorrectos: **400**; recursos ajenos o inexistentes: **404**.
- Escrituras PATCH requieren `X-Requested-With: XMLHttpRequest`, siguiendo el patrón existente en el calendario.
- El backend nunca toma un `usuarioId` proporcionado por el cliente para decidir qué notificaciones leer o actualizar.
- `fechaLectura` es la fuente de verdad del estado; no se mantiene otro flag potencialmente inconsistente.
- En el futuro, la interfaz debe **renderizar título y mensaje como texto**, nunca como HTML inyectado.

## Criterios de aceptación — Checklist de QA

- [ ] La migración se aplica sin modificar la tabla `alerta` ni borrar registros existentes.
- [ ] Cada notificación se conserva en PostgreSQL y está asociada a `usuario`.
- [ ] Usuario A puede listar, contar y leer únicamente sus propias notificaciones.
- [ ] Usuario B no puede marcar como leído un ID de A (responde 404).
- [ ] `fechaLectura` cambia al marcar como leído y no vuelve a modificarse al repetir la operación.
- [ ] Lectura masiva no modifica las notificaciones de otros usuarios.
- [ ] El contador devuelve el número correcto de registros con `fechaLectura = NULL`.
- [ ] Los registros permanecen al cerrar sesión y volver a ingresar.
- [ ] `npm run build` y los tests del módulo terminan correctamente.
