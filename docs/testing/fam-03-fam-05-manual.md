# Pruebas manuales FAM-03 y FAM-05

## Condiciones obligatorias

- Usar únicamente familias y personas sintéticas identificables con prefijo `QA_FAM_MANAGEMENT_`.
- Para pruebas locales de visualización puede usarse `viviendas-leon-postgres` en puerto 5432. No ejecutar reset, `db push`, migraciones ni seeds generales.
- Las pruebas de escritura automatizada deben usar exclusivamente `viviendas-leon-qa-postgres`, publicado en `127.0.0.1:5433`, después de verificar identidad, PostgreSQL 17 y volumen aislado.
- La base debe tener `FAMILIAS_WRITE` asignado de forma explícita al rol de coordinación. No concederlo a todos los usuarios de desarrollo.
- Preparar una familia sintética con al menos dos integrantes activos, un programa asociado y una participación de capacitación para uno de los integrantes.
- Registrar IDs y valores iniciales para comprobar que ningún registro preexistente cambia.

Si el contenedor QA, las credenciales privadas o el navegador no están disponibles, marcar la prueba como **omitida por entorno** y continuar. No sustituir QA por la base habitual para probar escrituras.

## Seguridad

1. Sin iniciar sesión, solicitar las rutas de listado, expediente y los cuatro endpoints de escritura. Deben responder 401.
2. Iniciar sesión con un usuario autenticado sin `FAMILIAS_WRITE`. Debe consultar el expediente, no ver controles de escritura y recibir 403 al invocar directamente cualquier PATCH/POST de administración.
3. Un usuario de campo sin alcance persistido debe recibir 403 en escrituras.
4. Iniciar sesión con coordinación y `FAMILIAS_WRITE`. Debe acceder a edición.
5. Confirmar que cambiar `RoleContext`, el selector visual, `NODE_ENV` o `ENABLE_FAMILY_INTEGRAL_API` no concede permisos.
6. Expirar la sesión con el formulario abierto y guardar. Debe mostrarse 401 sin perder el borrador en memoria.

## FAM-03 — familia

1. Abrir `/familias/editar`; verificar búsqueda, filtros y botón **Editar**.
2. Abrir `/familias/:id/editar`; comprobar expediente, nombre, comunidad, municipio calculado, fecha, observaciones y estado real de solo lectura.
3. Confirmar que el formulario no cambia el estado a `ACTIVA`.
4. Modificar cada campo permitido y guardar. Debe aparecer confirmación y ejecutarse una nueva consulta del expediente.
5. Recargar la página y verificar persistencia en PostgreSQL.
6. Confirmar que integrantes, programas, visitas, huertos y demás relaciones conservan sus IDs y cantidades.
7. Cambiar datos y pulsar **Cancelar**. Confirmar el descarte y comprobar que PostgreSQL no cambió.
8. Intentar abandonar mediante sidebar/enlace o recarga con cambios pendientes. Debe aparecer confirmación.
9. Enviar campos desconocidos, `id` o `estado`; esperar 400.
10. Abrir el mismo formulario en dos pestañas. Guardar primero en A y luego en B; B debe recibir 409 y no sobrescribir A.
11. Consultar un ID inexistente; esperar 404.

## FAM-05 — integrantes

1. Abrir la pestaña **Integrantes** y comprobar avatares, estados, contadores y conservación de la pestaña tras cada operación.
2. Agregar dos integrantes sintéticos. Fecha de nacimiento, sexo y parentesco deben ser obligatorios; teléfono y observaciones opcionales.
3. Verificar que el cuerpo no permite seleccionar otro `familiaId` y que los integrantes aparecen tras la recarga automática del expediente.
4. Editar un integrante con valores completos y otro registro histórico con nulos. Los campos no modificados y nulos históricos deben conservarse.
5. Intentar editar mediante un ID perteneciente a otra familia; esperar 404 sin filtrar sus datos.
6. Desactivar un integrante con participación en capacitación. La participación debe conservarse y no debe existir DELETE físico.
7. Reactivarlo y confirmar persistencia después de recargar.
8. Desactivar integrantes hasta dejar uno activo. El intento sobre el último debe responder 409.
9. Abrir dos modales/pestañas con la misma versión; la segunda actualización debe recibir 409.
10. Reenviar el mismo POST con igual `Idempotency-Key`; debe devolver el mismo integrante. Reutilizar la clave con otro contenido debe responder 409.
11. Simular una respuesta de red incierta durante un alta. No debe existir reintento automático; usar **Recargar y verificar expediente**.

## Auditoría

Para cada operación confirmada verificar una fila en `bitacora` con usuario, entidad, registro, acción y fecha. `datos_nuevos` debe contener `changedFields` y, solo para idempotencia, el hash de solicitud. No debe repetir nombres, teléfonos, observaciones ni fechas de nacimiento. Una validación fallida, 401, 403, 404 o 409 no debe generar auditoría de una escritura no confirmada.

## Conexión, almacenamiento y vistas obsoletas

1. Pasar el navegador a offline con un borrador abierto. Los botones de escritura deben quedar deshabilitados y el borrador permanecer solo en memoria.
2. Revisar localStorage, sessionStorage, IndexedDB y colas offline: no deben contener el borrador ni datos de integrantes creados/editados.
3. Reconectar y guardar; el expediente debe refrescarse desde el servidor.
4. Volver al listado con conexión. La consulta es remota primero y debe mostrar nombre, comunidad y contador actualizados, no una copia offline.

## Diseño, accesibilidad y transiciones

1. Probar 320, 375, 768, 1024 y 1440 px, en tema claro y oscuro, sin desbordamiento global.
2. Abrir modales con teclado, comprobar foco inicial, `Escape`, cierre y devolución del foco al disparador.
3. Confirmar entrada discreta del modal y una sola transición al cambiar de ruta. Cambios internos de pestaña o formulario no deben repetir la animación de ruta.
4. Activar `prefers-reduced-motion: reduce`; animaciones de ruta, wizard y modal deben quedar deshabilitadas.
5. Verificar mensajes con roles accesibles y errores junto a los campos.
6. Recorrer nuevamente el wizard integral de cuatro pasos para descartar regresiones.

## Comandos seguros

```powershell
npm run test -w @viviendas-leon/api
node --test apps/web/tests/familyWizard.test.mjs apps/web/tests/familyRecord.test.mjs apps/web/tests/familyManagement.test.mjs
npm run build --workspaces --if-present
npm run lint --workspaces --if-present
git diff --check
```

Prueba persistente aislada, solo con autorización y credencial QA:

```powershell
$env:RUN_FAMILY_MANAGEMENT_QA = 'true'
$env:QA_PASSWORD_FILE = 'C:\ruta-protegida\postgres-password.txt'
npm run test:management:qa -w @viviendas-leon/api
```

Si supera dos minutos o el entorno aislado no puede verificarse, interrumpir/omitir, registrar la causa y continuar con las pruebas no destructivas.
