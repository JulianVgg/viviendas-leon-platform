# Calendario del equipo y agenda personal

## Flujo

Dirección y Coordinación acceden a `/calendario` para consultar eventos institucionales, visitas y capacitaciones. Solo pueden crear o editar eventos institucionales desde esta vista: las visitas y capacitaciones se consultan sin botones de gestión.

Los técnicos trabajan en `/visitas/agenda` (Mi calendario). Al aceptar una invitación en Notificaciones, el evento institucional aparece allí como referencia de solo lectura, sin generar una segunda visita. Las invitaciones pendientes o rechazadas no se incluyen. El panel personal también consulta únicamente los eventos asignados al usuario.

El texto del pie del sidebar se reemplaza por un enlace a Notificaciones con contador. La campana del encabezado permanece disponible.

## Filtros y vistas

El calendario del equipo ofrece filtros por tipo, responsable, estado y comunidad, con Mes y Lista. Se aplican a los registros recuperados para el mes visible y no constituyen un reporte global.

## Seguridad

La API `/api/v1/calendario` comprueba el rol real de Dirección o Coordinación, además de la sesión. `/api/v1/invitaciones/mias` solo devuelve las invitaciones de la sesión. Una notificación antigua cuyo destino es `/calendario` abre `/visitas/agenda` para usuarios que carecen de permiso institucional y sí pueden consultar visitas.

La modificación **no revoca** permisos del módulo de Visitas Técnicas fuera de esta vista. Si se desea prohibir modificaciones ajenas en toda la aplicación, conviene hacerlo como una historia adicional de autorización.

## Checklist

1. Técnico: no aparece Calendario del equipo; una consulta directa a `/api/v1/calendario` devuelve HTTP 403.
2. Técnico: recibe invitación en Notificaciones y la acepta. Debe aparecer en Mi calendario, en violeta, sin crear una visita nueva.
3. Técnico: rechaza la invitación. Tras actualizar, deja de aparecer en Mi calendario.
4. Dirección/Coordinación: filtrar por responsable, estado, tipo y comunidad; alternar Mes y Lista.
5. Dirección/Coordinación: abrir visita o capacitación; se muestra tarjeta de solo lectura sin enlace a gestionar visitas.
6. Dirección/Coordinación: crear y editar un evento institucional; notificar participantes como antes.
7. Confirmar que la campana del encabezado y el contador inferior se actualizan.
8. Probar cambios de sesión entre Dirección y Técnico; no debe quedar acceso institucional disponible.

No requiere migraciones. La carga actual está limitada a 600 registros por categoría y mes; con mayor volumen será aconsejable implementar filtros paginados en backend.
