# Visitas técnicas — Ciclo de 8 días y textos de interfaz

## Alcance

- Se conserva el historial de reprogramaciones implementado anteriormente.
- La planificación consulta el último registro **REALIZADA** de cada familia y todas las citas **PROGRAMADA**, incluso si otro técnico las agendó.
- Al elegir una familia, se muestra su última visita, próxima sugerida y las visitas programadas.
- Una visita programada cubre una ventana de ocho días (fechas a menos de ocho días de distancia). Se permite agendar ciclos posteriores con ocho días o más de separación.
- Una visita pendiente con fecha ya vencida debe resolverse desde la agenda antes de crear una visita nueva.
- Si cambia una fecha de visita, se conserva el historial con responsable, fecha anterior, nueva fecha y motivo opcional.
- Las validaciones se aplican en frontend y backend, incluso frente a intentos concurrentes; se bloquea la fila de la familia al programar.
- La frecuencia de 8 días es un criterio operativo; no se crean citas automáticamente ni se sobrescriben las visitas realizadas.

## Compromisos

En Registrar visita → Compromisos, el campo **Revisión** permite dos opciones:

- **Próxima visita** (predeterminada): `revision_proxima_visita = true`, `fecha_limite = NULL`. El pendiente se muestra en la siguiente cita programada si la hay; en caso contrario permanece pendiente sin una fecha ficticia. Se muestra al registrar la siguiente visita de la familia.
- **Fecha específica**: se introduce fecha (`revision_proxima_visita = false`). Se conserva el funcionamiento existente de avisos con fecha límite.

El modo de revisión se sincroniza mediante la operación offline con UUID, sin perder las capturas antiguas que no incluyan `nextVisit` (equivalen a falso).

**Nota:** Los recordatorios automáticos con fecha exacta no se generan para un compromiso marcado «Próxima visita» hasta que se configure una fecha explícita. Su seguimiento aparece en la agenda y el registro de la visita siguiente.

## Migración

`20261027180000_visitas_ciclo_ocho_dias` agrega `revision_proxima_visita BOOLEAN NOT NULL DEFAULT FALSE` a `visita_seguimiento`. No elimina información previa.

## Validación local

1. Crear una cita para una familia el 10 de noviembre; al seleccionar la misma familia y el 15 de noviembre, confirmar que aparece **Con visita** y el guardado queda bloqueado.
2. Comprobar que el 18 de noviembre sí permite agendar el ciclo siguiente.
3. Reprogramar una visita existente e intentar moverla sobre otra cita del mismo ciclo; la API debe devolver `409`, sin alterar el historial.
4. Con una visita vencida, comprobar que no se crea otra hasta reprogramarla.
5. Registrar una visita y añadir compromiso con **Próxima visita**. Verificar en PostgreSQL `revision_proxima_visita = true` y `fecha_limite IS NULL`.
6. Programar la siguiente visita de esa familia: el compromiso aparece en su día dentro del calendario y en las tareas pendientes del registro.
7. Repetir con **Fecha específica** y verificar que se guarda la fecha.
8. Probar sin conexión: la captura conserva la selección de revisión y sincroniza cuando regresa la conexión, sin duplicados.
9. Validar en modo claro/oscuro y móvil, incluido el campo condicional de fecha y el nuevo panel de cobertura.

## Comandos

```bash
cd apps/api
npx prisma migrate deploy --config prisma7.config.ts
npx prisma generate --config prisma7.config.ts
cd ../..
npm run build
node --test apps/api/tests/visits-cycle.rules.test.mjs apps/api/tests/visits-reschedule.rules.test.mjs
```
