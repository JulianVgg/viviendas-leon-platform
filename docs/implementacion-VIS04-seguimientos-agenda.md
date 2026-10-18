# VIS-04 — Compromisos, seguimientos y agenda de visitas técnicas

## 1. Objetivo

Vincular los compromisos generados durante una visita técnica con revisiones en visitas posteriores, permitiendo consultar y actualizar su estado, visualizarlos en el calendario y ver próximos recordatorios. Se incluye una mejora de búsqueda en el formulario y se retira el manejo de USD de la captura operativa.

## 2. Modelo y reglas de negocio

- Los compromisos de una visita pueden asignarse a **Familia** u **ONG**. No están necesariamente ligados a una evaluación de cultivo, por lo cual VIS-04 usa `visita_seguimiento` en lugar del modelo `seguimiento_tecnico` preexistente (dependiente de `evaluacion_cultivo`).
- Cada compromiso utiliza un UUID creado en el cliente. Su registro en el servidor es atómico con la visita y es seguro ante reintentos offline.
- Estados: `PENDIENTE`, `CUMPLIDO`, `NO_CUMPLIDO`. Los dos últimos son resultados de revisión; **NO_CUMPLIDO permanece en la lista de compromisos abiertos**. El técnico puede volverlo a evaluar.
- Durante una visita, el paso 1 muestra compromisos anteriores abiertos de la familia seleccionada. Se revisan mediante opciones exclusivas (radio), evitando marcar Cumplió y No cumplió al mismo tiempo. Si no hay datos anteriores se muestra un mensaje claro.
- Al guardar la siguiente visita como `REALIZADA`, sus revisiones se aplican a los compromisos anteriores, sin borrar la evidencia histórica ni generar otra visita para esos mismos compromisos.
- Al guardar como `PROGRAMADA`, no se actualiza el estado de los compromisos (se hace cuando se realiza una visita o desde agenda).
- Edición desde agenda: estado, fecha límite, texto y observación del seguimiento. Cambiar fechas de visitas programadas también está permitido.
- El PATCH manual de agenda requiere internet. El registro de visitas y revisión de compromisos desde el formulario siguen utilizando la cola offline existente.
- Solo se consultan y modifican visitas/seguimientos pertenecientes al usuario autenticado y que tenga permisos de visitas.
- **Compatibilidad:** la migración trae los compromisos de capturas históricas VIS-03; el endpoint acepta operaciones antiguas pendientes sin `reviews` ni UUID por compromiso y mantiene el hash de sincronización anterior.

## 3. Frontend

- `VisitRegisterPage.tsx`: sección «¿Cómo le ha ido desde la última visita?» sustituida por los pendientes de la familia y sus resultados; compromiso con UUID; selector con búsqueda para familias, plantas, plagas/enfermedades e insumos. Retirados precio y total en dólares del formulario. El valor USD del contrato anterior se envía como `null` por compatibilidad mientras reportes se implementa.
- `SearchableSelect.tsx`: combobox táctil/teclado con filtrado tolerante a tildes, sin listas enormes.
- `VisitAgendaPage.tsx`: eventos de visitas programadas/realizadas y de compromisos por fecha, cards clicables; carrusel vertical de recordatorios con indicadores, vínculos de detalle, edición y nueva visita para esa familia.
- `VisitDetailDialog.tsx`: se reutiliza el modal con desenfoque, fotografías y datos técnicos, inyectando sección de seguimientos cuando se invoca desde Agenda.
- `FollowUpEditDialog.tsx`: edición del seguimiento con estado, texto, fecha y observación.
- `RescheduleVisitDialog.tsx`: cambio de fecha de visita programada.
- `visitService.ts`: lectura/cache offline de compromisos, referencias de revisión, llamadas PATCH de edición y reprogramación.

## 4. Backend / migración

- Nueva tabla `visita_seguimiento`: `id`, `visita_origen_id`, `texto`, `responsable`, `fecha_limite`, `estado`, `observacion_cierre`, marcas temporales e índices.
- La tabla ya existente `seguimiento_tecnico` se conserva sin alteraciones.
- Se migran compromisos antiguos en `visita_captura.datos.commitments` a la nueva tabla, con UUID derivados de la operación original y la posición del compromiso.
- Nuevas rutas autenticadas:
  - `GET /api/v1/visitas/seguimientos`: consultar por el usuario.
  - `PATCH /api/v1/visitas/seguimientos/:id`: modificar compromiso (requiere `X-Requested-With: XMLHttpRequest`).
  - `PATCH /api/v1/visitas/agenda/:visitId`: reprogramar fecha de visita programada.
- `POST /api/v1/visitas/sync`: crea compromisos con la visita y resuelve revisiones de la misma familia/propietario de forma transaccional.

## 5. Aplicación manual, sobre tu rama

Copiar los archivos del ZIP a las rutas indicadas sin reemplazar otras carpetas ni importar `node_modules`. **Haz primero una copia de los archivos existentes que tengan cambios sin commitear.**

La migración `apps/api/prisma/migrations/20261015203000_vis04_seguimientos/migration.sql` es **nueva** y se entrega lista; no generes otra migración con el mismo cambio.

Desde la raíz del monorepo en Windows:

```powershell
cd apps/api
npx prisma migrate deploy --config prisma7.config.ts
npx prisma generate --config prisma7.config.ts
cd ../..
npm run build
npm run dev
```

Requiere Docker PostgreSQL iniciado y `DATABASE_URL` en `apps/api/.env` con conexión válida. No borres IndexedDB ni la cola de visitas: los reintentos anteriores se preservan.

## 6. Escenarios de prueba sugeridos

1. **Visita A:** selecciona una familia, crea «Aplicar abono orgánico», responsable Familia y fecha de revisión; guarda y sincroniza. Debe aparecer como pendiente en Agenda.
2. **Agenda:** selecciona evento de visita; verifica modal con fotografía/datos/seguimientos y fondo desenfocado. Selecciona el pendiente amarillo y edita texto, fecha, observación o estado. Reprograma una visita programada desde su tarjeta.
3. **Visita B a la misma familia:** en paso 1 aparece el compromiso de A. Marca Cumplió o No cumplió y guarda como realizada. Al consultar Agenda, estado se actualiza; Cumplido deja de ser recordatorio activo; No cumplido continúa abierto.
4. **Primera visita de otra familia:** debe mostrar «No hay compromisos anteriores pendientes» y permitir crear nuevos en el paso 3.
5. **Búsqueda:** busca una familia/comunidad, planta, plaga y abono por fragmentos de texto; prueba en móvil y con teclado.
6. **Montos:** paso 2 muestra únicamente precio y total de ventas en Q; no aparecen USD.
7. **Offline:** realiza visita A sin red y después visita B a la misma familia también offline. Al recuperar conexión, la cola debe sincronizar A antes de B; sin duplicados. La edición directa desde Agenda solo se habilita cuando el compromiso esté sincronizado.
8. **Compatibilidad:** visita VIS-03 ya guardada y pendiente de foto debe continuar sincronizando después de aplicar la migración. Comprueba que no se crean duplicados.

## 7. Verificación en el paquete

- La compilación de TypeScript del frontend se completó correctamente (`tsc -b`).
- El build de Vite no se pudo completar en el contenedor Linux: el archivo original incluía dependencias nativas de Windows, no las correspondientes a Linux.
- El backend requiere regenerar Prisma Client con el nuevo modelo. No se pudo completar la generación ni probar la migración sin el binario Linux del motor Prisma ni una conexión a PostgreSQL en este entorno. **Validar backend y migración en Windows antes de realizar el PR.**
