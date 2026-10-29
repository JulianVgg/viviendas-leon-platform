# Calendario único del técnico — Integración

## Alcance
- En Mi calendario, seleccionar una fecha vigente y elegir **Visita técnica** o **Capacitación**.
- Visitas mantienen el flujo programada / realizada / reprogramada, con captura y fotos offline actuales.
- Capacitaciones reutilizan su formulario existente, registro de asistencia e historial; no se habilita su captura offline.
- Las capacitaciones nuevas conservan `usuario_responsable_id` desde la sesión; `GET /api/v1/capacitaciones?mias=1` muestra solo las propias.
- Los registros antiguos de capacitación, cuyo responsable está vacío, siguen en el historial general y calendario institucional, pero no se asignan automáticamente a ningún técnico.
- Dirección y Coordinación conservan `/calendario`, sin menú a los calendarios y pantallas de campo. No se altera todavía la tarjeta de supervisión ni los indicadores de desempeño.
- Horario de visita muestra **Turno mañana / Turno tarde** en el registro y en la programación.
- Historial de capacitaciones añade filtros de fecha y paginación local sobre los registros consultados (API limitada a 500).

## Aplicación
```bash
# Dentro de la raíz del repo
git apply --check --whitespace=nowarn CAL-agenda-unica-tecnico.patch
git apply --whitespace=nowarn CAL-agenda-unica-tecnico.patch
cd apps/api
npx prisma migrate deploy --config prisma7.config.ts
npx prisma generate --config prisma7.config.ts
cd ../..
npm run build
node --test apps/web/tests/personal-calendar-filters.test.mjs apps/web/tests/calendar-supervision.test.mjs
npm run dev
```

## Validaciones manuales
1. Iniciar sesión como técnico con `PANTALLA_CAPACITACIONES` y `CAPACITACIONES_WRITE`.
2. Abrir Mi calendario, seleccionar una fecha de hoy o posterior, elegir Capacitación y guardar.
3. Verificar que aparece en la agenda del mismo usuario y no en la agenda personal de otro técnico.
4. Abrir el detalle de la capacitación, registrar asistencia y consultar el historial filtrado y paginado.
5. Repetir el agendamiento de visita y verificar Turno mañana / Turno tarde en el formulario de registro.
6. Iniciar sesión como Dirección y Coordinación: debe mostrarse Calendario y no las agendas técnicas en el menú lateral.
7. Comprobar que el calendario institucional sigue mostrando eventos, visitas y capacitaciones existentes.
8. Confirmar que las invitaciones aceptadas y la cola offline de visitas no se alteran.

## Notificaciones push en desarrollo
El aviso «No hay Service Worker activo» es esperado durante `vite dev`, porque `vite-plugin-pwa` no activa el worker de producción por defecto. Probar después de compilar en la versión de vista previa (por ejemplo, `npm run build -w @viviendas-leon/web` y `npm run preview -w @viviendas-leon/web`). Se requiere un navegador compatible y la configuración VAPID del backend. No borrar IndexedDB para esta prueba.
