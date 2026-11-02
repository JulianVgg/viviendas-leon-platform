# CAL — Horarios y MON-02 — Indicadores de familias y programas

## Funcionalidades

- Dirección y Coordinación crean eventos institucionales `Todo el día` o con horario `Desde/Hasta` (24 h). Los eventos previos sin horario permanecen válidos como actividades de día completo.
- El calendario mensual y el listado muestran responsable y horario en una segunda línea compacta. Las visitas y capacitaciones muestran horario solo si está registrado; no se inventan horas.
- Al guardar un evento se revisan únicamente los **participantes institucionales** del mismo día. Un evento que termina a las 12:00 y otro que comienza a las 12:00 no se superponen. Un evento de día completo bloquea cualquier otra asignación institucional a esos participantes.
- Los participantes con estado `RECHAZADA` no mantienen el horario reservado. Las visitas técnicas siguen fuera de esta validación.
- El backend utiliza una transacción y bloqueo transaccional por fecha (`pg_advisory_xact_lock`) para reducir el riesgo de asignaciones simultáneas. Un cruce devuelve `409` y un mensaje legible.
- El dashboard institucional muestra MON-02: familias registradas, participación vigente y sin programa, cobertura, programas y comunidades. También se consulta en **Reportes → Indicadores**.
- Una familia que participa en dos programas solo cuenta una vez para cobertura global. Para cada programa cuenta una vez en su participación. Los datos se consultan desde PostgreSQL con los permisos existentes.
- La visualización toma patrones de TailAdmin Pro y emplea SVG/React ligero, sin instalar la biblioteca ApexCharts ni copiar los datos de ejemplo de la plantilla.

## Pruebas locales

1. Crear un evento de 11:00 a 12:00 para un participante; intentar uno de 11:30 a 12:30 para el mismo: debe devolver `409`.
2. Crear uno de 12:00 a 13:00 para el mismo participante: debe funcionar.
3. Crear un evento «Todo el día» en un día ya reservado y asignar el mismo participante: debe rechazarse.
4. Crear dos eventos solapados en la misma fecha para participantes distintos: deben permitirse.
5. Programar una visita técnica para una familia en la misma fecha y hora que un evento institucional: la regla institucional no debe bloquear esa visita.
6. Editar un evento, cambiando el horario: deben actualizarse invitaciones y notificaciones sin crear dos eventos.
7. Comprobar en la vista mensual, Lista y Actividades del día que aparecen responsable y hora en una segunda línea.
8. En Dashboard y Reportes → Indicadores, comprobar que una familia asignada a dos programas cuenta una sola vez en el total de familias participantes.
9. Comprobar los permisos de un técnico: la nueva API de indicadores institucionales debe devolver `403`.

## Comandos

```powershell
npm run build
node --experimental-strip-types --test apps/api/tests/calendar-schedule.rules.test.mjs apps/api/tests/families-programs.rules.test.mjs
npm run dev
```

## Restricciones

No se modifican las tablas ni se requieren migraciones. La validación de concurrencia debe confirmarse en PostgreSQL real antes de aprobar el PR. No se alteran las agendas de visitas técnicas ni su periodicidad de ocho días.
