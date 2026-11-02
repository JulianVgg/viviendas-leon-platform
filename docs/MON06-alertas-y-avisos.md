# MON-06 — Alertas y seguimientos pendientes (#80)

## Alcance

- Dashboard: `Alertas y seguimientos` consulta las visitas **programadas y anteriores a hoy**, compromisos **PENDIENTE** y sus vencimientos. La fecha se evalúa en `America/Guatemala`.
- Tres indicadores: visitas vencidas, compromisos pendientes y compromisos vencidos (estos últimos son un subconjunto de los pendientes, no deben sumarse como si fueran categorías excluyentes).
- Listados del Dashboard: tarjetas de resumen, acceso al detalle por registro y modal con 10 filas por página.
- Dirección/Coordinación pueden filtrar los resultados por comunidad y responsable; el técnico ve únicamente visitas que le corresponden y compromisos originados en esas visitas.
- El detalle de una visita supervisada se abre en **Calendario** en modo consulta, usando `?visitId=`, sin habilitar edición. Para técnicos se utiliza `Mi calendario` y los seguimientos usan `?seguimiento=`.
- No se modifican automáticamente las visitas o compromisos por mostrarlos como vencidos.

## Notificaciones emergentes (sesión abierta)

- `NotificationDropdown` consulta las notificaciones no leídas mientras la pestaña está activa, cada 10 segundos, y cuando vuelve al foco.
- En el primer sondeo establece el último identificador conocido sin mostrar notificaciones anteriores.
- Cuando detecta un identificador nuevo, muestra un aviso discreto en la esquina inferior derecha durante **5 segundos**, con barra de tiempo y botón de cierre. Al pulsarlo abre `/notificaciones`; no marca la notificación como leída antes de que el usuario la consulte.
- El contador, la bandeja y la persistencia de notificaciones no cambian. No necesita autorización del navegador para push. **No es una notificación del sistema operativo:** la pestaña debe estar abierta y activa. La llegada puede tardar hasta el próximo sondeo. Para notificaciones instantáneas o con la página cerrada se necesita push/WebSocket/SSE.
- Se respeta `prefers-reduced-motion`.

## Comprobaciones recomendadas

1. En Dirección, comprobar que el Dashboard contabiliza las visitas vencidas de varios técnicos, las pendientes y las vencidas por fecha; cambiar comunidad/responsable y verificar coincidencia de totales y listados.
2. En Técnico, comprobar que no se muestran actividades de otros usuarios y que cada enlace abre la visita o el compromiso correcto.
3. Reprogramar/completar una visita o compromiso, actualizar Dashboard y comprobar que deja de figurar como vencido/pendiente.
4. Abrir la aplicación con notificaciones anteriores: no debe aparecer un aviso antiguo. Crear una notificación nueva desde otra sesión y comprobar el mensaje temporal, la barra y la navegación. Marcarla como leída y confirmar que no reaparece.
5. Comprobar el resultado con una visita del día actual en horario de Guatemala: no debe marcarse vencida.
6. Ejecutar `npm run build` y las pruebas indicadas abajo con las dependencias ya instaladas.

```bash
npm run build
node --test apps/api/tests/mon06-alertas.test.mjs apps/api/tests/mon05-filtros.test.mjs apps/api/tests/mon03-indicadores.test.mjs
node --experimental-strip-types --test apps/web/tests/notification-toast.test.mjs apps/web/tests/dashboard-filters.test.mjs
```

**Migraciones:** ninguna. **Nuevas dependencias:** ninguna.
