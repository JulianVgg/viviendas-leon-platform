# Calendario — detalle de visitas y foto de perfil

## Cambios

- Calendario institucional: al seleccionar una visita se consulta su detalle por `GET /api/v1/calendario/visitas/:id/detalle`. La consulta exige sesión y rol de Dirección o Coordinación. Las respuestas incluyen la captura, evidencias, compromisos vigentes y reprogramaciones; son de solo lectura.
- Las evidencias se cargan mediante la ruta autenticada de visitas, no se hacen públicas.
- Historial y agenda técnica: `VisitDetailDialog` usa tarjetas compactas, secciones por información disponible y galería sólo cuando hay fotografías. Evita mostrar un gran panel vacío en visitas sin evidencia.
- El encabezado consulta la fotografía desde `/api/v1/perfil/foto` y usa iniciales cuando no existe. Al actualizar o eliminar la foto desde Mi perfil se refresca el avatar.
- **Usuarios**: el formulario administrativo de creación de usuarios no ofrece actualmente subida de foto; la carga ya está implementada desde Mi perfil. No se incorporó una segunda ruta de carga administrativa.

## Validación local

```bash
npm run build
node --experimental-strip-types --test apps/web/tests/calendar-visit-detail.test.mjs
node --test apps/web/tests/calendar-supervision.test.mjs apps/web/tests/personal-calendar-filters.test.mjs
npm run dev
```

## Casos funcionales

1. Dirección abre Calendario, selecciona una visita programada: ve responsable, comunidad, fecha y turno, sin edición.
2. Dirección abre una visita realizada con evidencia: ve fotografía, cultivos, observaciones y compromisos. No sale de Calendario.
3. Un técnico abre Historial y selecciona una visita con foto: se muestra la misma ficha, con galería.
4. Una visita sin fotos no deja la mitad del diálogo ocupada por un placeholder gigante.
5. Un técnico intenta acceder a `/api/v1/calendario/visitas/58/detalle`: recibe 403.
6. Usuario actualiza foto en Mi perfil: el avatar del encabezado cambia sin recargar.
7. Un usuario sin foto mantiene las iniciales y un cambio de sesión no muestra la foto de otro usuario.

No hay migración Prisma. La compilación del backend requiere cliente Prisma generado con el esquema actual. Se conservan las reglas de permisos y los flujos offline.
