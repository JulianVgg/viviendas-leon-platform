# Trazabilidad de visitas y compromisos — Octubre de 2026

## Objetivo

Una visita PROGRAMADA con fecha anterior al día local de Guatemala se muestra como **Vencida**, no como «No cumplió». El responsable debe reprogramarla a hoy o una fecha posterior antes de vincular una captura REALIZADA. El registro REALIZADA se realiza con la fecha real del día de captura. Las citas futuras solo se completan cuando llegue su fecha. Las visitas sin programación también se registran el día de la captura.

## Historial permanente

Dos tablas nuevas guardan cada cambio: `visita_reprogramacion` y `seguimiento_reprogramacion`. Contienen fecha original, fecha nueva, usuario, motivo opcional y momento del cambio. El identificador de visita o seguimiento **no cambia**. Una marca de calendario en el día antiguo permite ver la reprogramación, y el registro aparece en el día nuevo.

Los compromisos `PENDIENTE` y los registros históricos `NO_CUMPLIDO` pueden reprogramarse desde la agenda. La reprogramación mantiene el compromiso abierto como `PENDIENTE`. Un compromiso `CUMPLIDO` no puede reprogramarse. Se evita crear un registro redundante si la fecha nueva es igual a la actual.

## Capturas offline

Las nuevas capturas `REALIZADA` incorporan `capturedAt`: hora UTC del momento en que se guardaron en IndexedDB. La fecha del formulario debe coincidir con el día local guatemalteco de ese instante; se rechazan fechas distintas y marcas temporales futuras. Una captura legítima realizada sin Internet el lunes debe seguir pudiendo sincronizarse el miércoles con la fecha del lunes.

Para proteger operaciones antiguas que ya están en IndexedDB antes de este cambio, la validación estricta de la fecha y de la cita se aplica a capturas nuevas con `capturedAt`. Las operaciones antiguas permanecen bajo su flujo de compatibilidad. No borrar el almacenamiento local.

La reprogramación requiere conexión: el formulario offline no puede modificar fechas de citas en PostgreSQL. Si una cita está vencida, primero hay que recuperar conexión y reprogramarla; después puede registrarse la visita en su fecha correspondiente.

## Aplicación

Desde la raíz del repositorio:

```bash
git apply --check VIS-trazabilidad-cambios.patch
git apply VIS-trazabilidad-cambios.patch
cd apps/api
npx prisma migrate deploy --config prisma7.config.ts
npx prisma generate --config prisma7.config.ts
cd ../..
npm run build
node --test apps/api/tests/visits-reschedule.rules.test.mjs
npm run dev
```

## Pruebas manuales recomendadas

1. Como técnico, abrir Agenda. Una visita PROGRAMADA anterior a hoy debe aparecer en rojo y ofrecer «Reprogramar».
2. En Registrar visita, la misma programación antigua debe aparecer en rojo y no ser seleccionable. Intentar guardar sin vincular debe indicar que existe una cita vencida de esa familia.
3. Reprogramar la visita antigua para hoy. Verificar un registro nuevo en `visita_reprogramacion` y una marca gris en el día original del calendario.
4. Registrar la visita hoy seleccionando la cita ya reprogramada. Comprobar que se utiliza el mismo ID de visita y que el estado pasa a REALIZADA.
5. Desde una fecha futura de otra visita, intentar registrar hoy: no debe permitirlo.
6. Abrir un compromiso pendiente con fecha vencida y elegir «Reprogramar compromiso». Guardarlo con nueva fecha. Comprobar que en `seguimiento_reprogramacion` queda un registro y que hay una marca gris en la fecha original.
7. Verificar que un compromiso CUMPLIDO no puede reprogramarse.
8. Comprobar con el técnico sin conexión que las capturas registradas el día correcto se mantienen y se sincronizan más adelante con su `capturedAt`.
9. Revisar Director/Coordinación: pueden ver visitas vencidas pero solo editar cuando su permiso lo permite; el seguimiento mantiene autorización por propietario.
10. Crear múltiples reprogramaciones sobre la misma visita y validar que el calendario y el detalle conservan **todas** las fechas anteriores.

## Consultas PostgreSQL

```sql
SELECT * FROM visita_reprogramacion ORDER BY creado_en DESC LIMIT 20;
SELECT * FROM seguimiento_reprogramacion ORDER BY creado_en DESC LIMIT 20;
```

**Nota:** estas pruebas unitarias no reemplazan la validación con PostgreSQL real, el cliente Prisma regenerado ni las pruebas end-to-end en navegador. Tampoco se aplica una periodicidad obligatoria: el sistema enseña la última visita realizada como referencia para la atención semanal y permite visitas extraordinarias cuando se necesiten.
