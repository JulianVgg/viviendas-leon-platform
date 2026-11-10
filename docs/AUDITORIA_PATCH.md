# Parche de auditoría — ViviendasLeón

## Alcance

La aplicación **ya posee** el modelo Prisma `Bitacora` y los permisos `PANTALLA_AUDITORIA` / `PANTALLA_BITACORA`. El parche registra operaciones relevantes de escritura en el middleware HTTP, agrega endpoints protegidos de lectura y habilita una pantalla con filtros, paginación y detalle de resultados. El rol **Auditor** obtiene permisos de lectura mediante una migración de datos. Dirección general conserva su bypass institucional.

Las entidades auditadas son autenticación, perfiles, usuarios, roles, familias, comunidades, municipios, programas, huertos, cultivos, insumos, sanidad, ciclos agrícolas, producción, visitas, capacitaciones, calendario, invitaciones y reportes.

Se registra `usuario_id`, `entidad`, `registro_id` (cuando se pueda identificar), `accion`, `fecha`, `datos_nuevos` (únicamente metadatos de método/ruta normalizada/resultado HTTP) y `descripcion`. **No se incluyen** contraseñas, datos de familias, cuerpos de petición, cookies, tokens ni respuestas completas. `datos_anteriores` queda vacío deliberadamente.

### Instalación

Desde la raíz del repositorio:

```bash
cd apps/api
npm install
npx prisma migrate deploy --config prisma7.config.ts
npx prisma generate --config prisma7.config.ts
npm run build
node --test tests/audit.rules.test.mjs
```

En el frontend:

```bash
cd apps/web
npm install
npm run build
```

Después de desplegar ambos componentes, ingresar como un usuario con rol **Auditor** o con el permiso de pantalla `PANTALLA_BITACORA`, y abrir `/auditoria/bitacora`. El API disponible es `GET /api/v1/auditoria/bitacora?page=1&limit=20&usuarioId=&entidad=&accion=&desde=&hasta=` y `GET /api/v1/auditoria/usuarios`. Los filtros por fecha se interpretan en la zona fija **Guatemala (UTC-06)**. El API no ofrece modificar ni borrar la bitácora.

### Pruebas manuales recomendadas

1. Iniciar sesión, cambiar una familia, registrar una visita y cerrar sesión. Volver como Auditor y verificar usuario, módulo, operación, fecha y resultado.
2. Repetir una modificación denegada (por ejemplo, un rol sin permiso) y confirmar que figure como `RECHAZADO` si existe una sesión válida.
3. Probar que una cuenta sin `PANTALLA_BITACORA` reciba HTTP 403 al consultar `/api/v1/auditoria/bitacora`.
4. Verificar que consultas GET ordinarias y notificaciones de lectura no saturan la bitácora.
5. Probar filtros por usuario, tipo, rango de fecha y la paginación.
6. Verificar que jamás aparecen contraseñas, información personal de beneficiarios ni cuerpos de formularios en los nuevos registros.

### Límites de esta implementación

Este parche cubre **eventos HTTP**: no garantiza una auditoría transaccional de todas las modificaciones a nivel de base de datos ni captura los valores anteriores y posteriores de cada campo. El listener `finish` escribe la bitácora **después** de enviar la respuesta; una caída del proceso o un error de base de datos puede perder un evento (el error se reporta al log del servidor). Si la institución necesita una auditoría con garantía de persistencia, debe registrar la mutación y el evento en la **misma transacción** de Prisma, o establecer una auditoría a nivel de PostgreSQL con contexto de actor. Los rechazos de inicio de sesión sin usuario autenticado no se insertan porque `bitacora.usuario_id` es obligatorio; se requiere un registro separado para intentos anónimos. Reintentos offline pueden producir varios eventos HTTP para la misma operación lógica.

Antes de ejecutar en producción, realizar backup y probar el parche en un entorno de pruebas con la base de datos real. Las operaciones existentes no se reescriben, y no se modifica el modelo Prisma actual.
