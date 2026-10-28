# Mi calendario y evaluación agrícola — Ajuste de interfaz

Base: versión del 28/10/2026 con parche CAL-supervision-agenda-personal aplicado y AGR-03 integrado.

## Mi calendario (técnicos)

- Filtros por actividad: todas, visitas, compromisos, eventos institucionales, reprogramaciones.
- Por estado: todas, programadas, vencidas, realizadas, finalizadas, pendientes, no cumplido.
- Búsqueda por familia, comunidad, evento o ubicación del evento. Botón «Limpiar».
- Los filtros actúan en el calendario mensual, lista del día y próximas actividades. Las invitaciones siguen filtradas por estado `ACEPTADA`/`ASIGNADO` desde el servicio existente.
- No se modifica la API, los permisos ni los datos almacenados; son filtros de presentación sobre los registros autorizados ya obtenidos.

## Paso 2 de Registrar visita

- Al seleccionar familia, se consultan sus siembras activas de AGR-03 (`listCycles({familiaId})`).
- Cada ciclo muestra cultivo, huerto, cantidad inicial y fecha de siembra. «Evaluar» crea una ficha de evaluación vinculada al `cicloCultivoId` y al nombre del cultivo existente.
- Una misma siembra no puede aparecer dos veces en la evaluación de una visita.
- «Cantidad de plantas» en el formulario representa el número *observado* hoy: no se copia automáticamente la cantidad inicial.
- Si no hay siembras activas o no se pudieron descargar, se conserva la captura manual compatible con operaciones históricas y offline; cuando la API responde 401/403, no se muestran ciclos del caché.
- No se modifican el esquema, la sincronización, los formularios de compromiso ni el registro de nuevas siembras. El historial por ciclo y el nuevo campo `cantidadPlantasObservadas` quedan para AGR-04.

## Verificación

1. Iniciar sesión como técnico y abrir «Mi calendario». Filtrar visitas vencidas y buscar por nombre de familia o comunidad.
2. Elegir «Eventos» y confirmar que se muestran invitaciones institucionales aceptadas. Revisar «Reprogramaciones».
3. Registrar visita de una familia con dos siembras activas. Ambas aparecen como alternativas; evaluar una y comprobar que la otra no se agrega automáticamente.
4. Seleccionar dos siembras del mismo cultivo con `cicloCultivoId` diferentes (si existen). Ambas deben poder evaluarse.
5. Cambiar de familia: las selecciones anteriores deben desaparecer.
6. Probar sin conexión tras haber consultado previamente los ciclos; comprobar que se conserva su vínculo al sincronizar.
7. Compilar `npm run build -w @viviendas-leon/web` y probar `node --test apps/web/tests/personal-calendar-filters.test.mjs`.
