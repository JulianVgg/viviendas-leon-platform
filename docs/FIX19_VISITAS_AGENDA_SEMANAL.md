# FIX19 — Agenda semanal de Visitas Técnicas

## Cambios

- En «Familias con huerto», las citas vencidas muestran **Reprogramar** y abren el diálogo de reprogramación de la cita existente, no una nueva visita. Si corresponde a otro responsable o no está sincronizada, la aplicación bloquea la acción y explica el motivo.
- El diálogo «Agendar visita» deja de mostrar familias sugeridas; la elección se realiza en su selector o en «Familias con huerto».
- La primera fecha la elige el técnico. Al sincronizar una cita nueva, el servidor registra **una cita adicional siete días después** (20 → 27), siempre que esa ventana no tenga otra cita. Ambas se crean en una transacción atómica; el UUID de la operación offline impide duplicados.
- La planificación semanal utiliza una separación mínima de siete días. Esto ajusta las reglas anteriores de ocho días; revisar especialmente citas preexistentes antes de un despliegue institucional.
- «Mis actividades» abre con próximos 30 días y ocho tarjetas inicialmente. «Todas» se limita a 30 días anteriores y 90 futuros, con «Mostrar más». Las citas vencidas siguen consultables con su propio filtro. **No se borran registros históricos**.

## Verificación sugerida

1. Agendar con el técnico una familia sin citas pendientes para el día 20. Al sincronizar, verificar dos citas únicas: 20 y 27.
2. Desconectar el teléfono, agendar otra familia y reconectar: deben sincronizarse una sola vez ambas citas.
3. Repetir una petición con el mismo operationId: no debe crear una tercera cita.
4. Confirmar que una cita vencida abre el diálogo «Reprogramar visita» y que su ID permanece igual después de guardar.
5. Confirmar que «Familias sugeridas para esta fecha» ya no aparece.
6. Alternar «Próximas», «Vencidas» y «Todas» en Mis actividades, y probar «Mostrar más». El historial anterior no se elimina.

No requiere migraciones de Prisma ni cambios en variables de Railway. Aplica **después del FIX18**.
7. Reprogramar una cita inicial cuando ya tiene una segunda cita automática: la segunda debe desplazarse también siete días después, sin tocar citas registradas manualmente. Si existe otra cita en conflicto, ambas operaciones se rechazan sin modificar fechas.
