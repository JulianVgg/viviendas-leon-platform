# MON-01 — Dashboard e integración de perfil

## Cambios incluidos

- `/` ahora contiene el dashboard con gráficos de visitas realizadas, capacitaciones y, para Dirección/Coordinación, distribución de familias por programa.
- `/mi-agenda` muestra los pendientes y actividades personales de NTF-06, con acceso propio en el menú justo debajo de «Mi calendario».
- `GET /api/v1/dashboard/resumen?meses=3|6|12`: resúmenes exclusivamente del usuario autenticado para perfiles no supervisores; datos institucionales para Dirección/Coordinación. Los indicadores provienen de PostgreSQL y no contienen datos de ejemplo.
- El formulario de dirección consulta el catálogo estático `GET /api/v1/perfil/ubicaciones` (22 departamentos, 340 municipios filtrados por departamento), en lugar de los municipios sintéticos del seed.
- Todos los usuarios pueden subir/reemplazar/eliminar su foto de perfil; solo Dirección/Coordinación pueden editar nombre, apellido y correo. Otros perfiles conservan la edición de su teléfono.
- Fotografía más visible en «Mi perfil» y el encabezado. Se mantiene la validación JPG/PNG de hasta 2 MB.

## Cómo probar

1. Desde la raíz del proyecto ejecutar `npm run build` y `npm run dev`.
2. Abrir como Dirección: Dashboard → seleccionar 3, 6 y 12 meses → observar indicadores y gráficos basados en datos actuales de PostgreSQL.
3. Iniciar sesión como Técnico: verificar que Dashboard solo refleje sus visitas y capacitaciones; abrir «Mi agenda» y comprobar sus actividades personales.
4. Abrir «Mi perfil» como Técnico, seleccionar la fotografía, guardarla y confirmar su aparición en el encabezado; comprobar que nombre y correo sigan bloqueados.
5. Abrir «Editar dirección» con Dirección y seleccionar Sololá → Panajachel o Santa Lucía Utatlán; comprobar que Chiquimula no incluya Panajachel.
6. Intentar guardar una combinación incompatible de departamento y municipio desde API: debe responder 400.

## Pruebas

`node --experimental-strip-types --test apps/api/tests/dashboard-summary.rules.test.mjs`

`node --test apps/api/tests/dashboard-summary.service.test.mjs`

## Alcance y observaciones

- No hay migraciones. Las ubicaciones del perfil se almacenan como texto en los campos existentes; el catálogo solo regula la selección y validación del perfil personal.
- El catálogo administrativo de municipios del programa sigue separado y puede contener datos sintéticos de prueba; estos no aparecen en «Mi perfil».
- El catálogo territorial toma como referencia listas públicas de los 340 municipios, contrastadas con el total oficial para 2026 de SEGEPLAN. Conviene revisar variantes de nombres municipales cuando se integre un catálogo territorial institucional con códigos INE.
- El conteo «Familias beneficiarias» incluye todos los expedientes registrados; los valores de programas reflejan afiliaciones históricas y activas según las relaciones actuales, no únicamente familias activas.
- Los gráficos son consultas de lectura; no alteran huertos, visitas, agenda ni producción agrícola. Para una solución masiva puede optimizarse el resumen mensual mediante agregaciones SQL.
