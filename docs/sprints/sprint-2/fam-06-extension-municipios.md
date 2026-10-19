# FAM-06 · Extensión: administración de municipios

## Alcance

Agregar la gestión de municipios al menú Administración, además del catálogo de comunidades ya implementado. Se mantiene el esquema `Municipio(id, nombre, activo)` de Prisma y la referencia `Comunidad.municipioId`. No se crean tablas nuevas ni se modifican claves externas.

## API

- `GET /api/v1/municipios`: catálogo de municipios activos para el formulario de comunidades; **conserva el contrato anterior**.
- `GET /api/v1/municipios/administracion`: listado administrativo con todos los estados y conteos de comunidades.
- `POST /api/v1/municipios`: alta con `nombre`, `activo = true`.
- `PATCH /api/v1/municipios/:id`: cambio de nombre sin cambiar el `id`.
- `PATCH /api/v1/municipios/:id/estado`: activación/desactivación mediante `{ "activo": boolean }`.

Todos los endpoints requieren sesión. Listado administrativo: `PANTALLA_MUNICIPIOS`; escritura: `MUNICIPIOS_WRITE`. Ambos permisos se asignan a Dirección general y Coordinación mediante migración. El acceso público anónimo no está permitido.

## Reglas de negocio

- No se permite un nombre vacío, ni nombre mayor a 120 caracteres.
- Se detectan nombres existentes sin distinguir mayúsculas/minúsculas; se mantiene el índice único ya establecido sobre `nombre`.
- No se elimina físicamente ningún municipio ni su información asociada.
- No se desactiva un municipio si tiene comunidades activas. Se deben desactivar primero, cumpliendo a su vez las restricciones sobre familias activas.
- La edición del nombre conserva comunidades y familias relacionadas porque la clave primaria no se altera.
- Las acciones se registran en `bitacora` junto con el usuario responsable, dentro de la misma transacción.
- Las modificaciones requieren conexión a internet; esta ampliación no agrega mutaciones offline.

## Criterios de aceptación

- Se muestra Administración → Municipios cuando el usuario tiene permiso.
- Un usuario autorizado puede crear y modificar municipios.
- El nuevo municipio queda disponible en el selector de la pantalla Comunidades.
- Las comunidades existentes permanecen asociadas al mismo municipio tras renombrarlo.
- No se puede desactivar un municipio con comunidades activas.
- Un usuario sin `MUNICIPIOS_WRITE` recibe 403 en rutas de escritura.
- Nombre inválido produce 400; duplicado produce 409; registro inexistente produce 404.
- Verificar migración, build y pruebas sobre el ambiente local antes de crear el PR.

## Propuesta pendiente: mapa geográfico/satelital

Se propone desarrollar en otro issue una pestaña «Mapa» para representar comunidades/municipios a partir de ubicaciones verificadas. No debe inferirse que las coordenadas representan los límites geográficos oficiales. MapLibre GL JS con proveedor de tiles con licencia y servicio adecuados permitiría mapas callejeros y una base satelital; jsVectorMap sirve para estadísticas por país/región, no para inspeccionar comunidades a nivel de calle. La app actual aún no integra las dependencias ni datos espaciales necesarios para dicho módulo.
