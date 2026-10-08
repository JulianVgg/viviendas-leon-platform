# FAM-01 — Consultar listado de familias

## Objetivo

Permitir consultar las familias registradas en la plataforma y localizar una familia mediante búsqueda o filtros básicos.

## Implementación

- Se agregó `GET /api/v1/familias` con paginación.
- La consulta incluye familia, comunidad, programas asociados, cantidad de integrantes, fecha de ingreso y estado.
- Se admite búsqueda por nombre de referencia de la familia, integrante, comunidad o programa.
- Se admite filtro por estado y, a nivel de API, por comunidad y programa.
- La interfaz de familias consume la API, muestra estados de carga/error/vacío y permite buscar y filtrar por estado.
- Es posible reintentar una consulta fallida o repetir la misma búsqueda.
- Si una página deja de existir, se consulta automáticamente la última página disponible. Una página vacía con coincidencias conserva la navegación y ofrece volver a la primera página.
- Los parámetros repetidos o de tipos inválidos, identificadores fuera del rango de PostgreSQL y desplazamientos de paginación inválidos devuelven HTTP 400.
- El frontend usa `/api` por defecto con proxy local de Vite; el despliegue se describe en `docs/environment-setup.md`.

## Parámetros disponibles

| Parámetro | Descripción |
|---|---|
| `search` | Texto para localizar familia, integrante, comunidad o programa. |
| `estado` | Estado de la familia. |
| `comunidadId` | Identificador de comunidad. |
| `programaId` | Identificador de programa. |
| `page` | Página solicitada. |
| `limit` | Entero positivo de registros por página (máximo 100; valores mayores devuelven HTTP 400). |

## Criterios de aceptación

- [x] Se muestran las familias registradas.
- [x] La información principal es visible.
- [x] Es posible localizar una familia mediante búsqueda y filtro de estado.
