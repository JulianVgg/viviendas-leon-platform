# NTF-06 — Mi agenda y resumen personal de actividades (#175)

## Alcance

Se incorpora «Mi agenda» al dashboard, reutilizando los registros reales de PostgreSQL. Se agregan indicadores y tres listas: **hoy**, **próximas** (30 días) y **pendientes** (compromisos de VIS-04 y visitas programadas vencidas).

El endpoint `GET /api/v1/mi-agenda` devuelve la información de la **sesión autenticada**, sin aceptar `usuarioId` desde el navegador. No se agrega ninguna tabla ni migración nueva.

## Fuentes de datos

- **Evento institucional**: únicamente si el usuario autenticado figura como responsable o participante, y posee permiso para el calendario. Se usa `OR` en una única consulta para evitar repetir eventos al cumplir ambos criterios. Si el evento abarca varios días, aparece como actividad del día mientras esté vigente.
- **Visita técnica**: solo `PROGRAMADA` y `usuarioResponsableId` de la sesión. El endpoint no replica la visita como evento institucional; usa su tabla original.
- **Compromiso**: `visita_seguimiento.estado = PENDIENTE` vinculado a visitas cuyo responsable es el usuario; permite fechas límite nulas.

Aun en Dirección o Coordinación el **dashboard personal** muestra solamente asignaciones personales; el calendario institucional y la agenda técnica conservan sus vistas generales.

Se comprueban los permisos de los módulos y, para visitas, además los permisos de lectura/gestión de datos. El backend no confía en roles, IDs ni permisos enviados desde el cliente.

## Contrato

`GET /api/v1/mi-agenda`

```json
{
  "fechaHoy": "2026-10-22",
  "horizonte": "2026-11-21",
  "indicadores": {
    "actividadesHoy": 0,
    "proximasActividades": 0,
    "visitasProgramadas": 0,
    "compromisosPendientes": 0
  },
  "hoy": [],
  "proximas": [],
  "pendientes": [],
  "modulos": { "calendario": true, "visitas": true }
}
```

La API utiliza `Cache-Control: private, no-store`; fecha local `America/Guatemala`; rangos de fechas en `@db.Date`. Las listas tienen límite de elementos para mantener ágil el dashboard; el contador de visitas y compromisos se calcula sobre todos los registros filtrados.

La aplicación pide información al abrir el dashboard, al recuperar el foco y al pulsar «Actualizar». Hay estados de carga, error y listas vacías; no utiliza datos simulados.

## Instalación

Aplicar el parche sobre la rama que ya incluya NTF-01 ... NTF-05.

```bash
git apply --check NTF-06-cambios.patch
git apply NTF-06-cambios.patch
npm run build -w @viviendas-leon/web
npm run build -w @viviendas-leon/api
node --test apps/api/tests/my-agenda.test.mjs
npm run dev
```

No ejecutar `prisma migrate deploy` para esta historia: **NTF-06 no introduce migraciones**. Si el backend reporta tipos de NTF-04/05 ausentes, ejecutar desde `apps/api` `npx prisma generate --config prisma7.config.ts` y regresar a la raíz.

## Pruebas manuales

1. Iniciar sesión como técnico con visitas asignadas y comprobar que aparecen sus visitas `PROGRAMADA` (hoy y futuras) y compromisos de visitas propias.
2. Iniciar sesión como otro técnico y verificar que no ve los registros del primero.
3. Crear un evento institucional con el usuario como participante; debe verse una sola vez, aunque también sea responsable.
4. Reprogramar un evento o visita y pulsar «Actualizar»: debe reflejarse la fecha nueva.
5. Marcar una visita `REALIZADA`: ya no debe aparecer como visita programada.
6. Completar un compromiso: desaparece de los pendientes, pero sigue en su registro original.
7. Crear actividad en un rango de varios días que incluya hoy y comprobar que aparece en «Hoy».
8. Revisar usuario sin permisos de calendario/visitas: no se revelan datos de esos módulos.
9. Probar en móvil y modo oscuro: cards y listas deben adaptarse.
10. Abrir un elemento y comprobar navegación al calendario o agenda. El enlace es a la pantalla existente, no a un detalle inexistente.
11. Sin registros, el dashboard debe mostrar estados vacíos, sin datos inventados.
12. Desconectar backend y volver a conectar: mostrar error claro y permitir reintento.

## Limitaciones conscientes

- «Mis pendientes» identifica compromisos asociados a visitas del usuario, no es aún un gestor genérico de tareas.
- Las actividades sin hora específica se ordenan por día; no se inventa una hora.
- La lista de próximas actividades cubre 30 días y limita el número visible; el histórico queda en el calendario/agenda correspondiente.
- Las visitas capturadas exclusivamente en IndexedDB todavía no sincronizadas no aparecen en este resumen de PostgreSQL; la agenda técnica mantiene su funcionalidad offline.
