# FIX8 — Fotografías, Excel y control financiero

## Aplicación y migración

El parche es **incremental sobre FIX7** (incluye FIX5 y FIX6). Aplicar en una rama actualizada:

```powershell
git apply --check ViviendasLeon_FIX8_fotos_reportes_control_financiero_20261111.patch
git apply ViviendasLeon_FIX8_fotos_reportes_control_financiero_20261111.patch
npm run build
```

**Hay migración obligatoria:** `20261111234000_fix8_fotos_finanzas_roles`. En Railway, comprobar `DATABASE_URL` y ejecutar desde `apps/api` (en el despliegue de API, no solo en tu PC):

```powershell
cd apps/api
npx prisma migrate deploy --config prisma7.config.ts
npx prisma migrate status --config prisma7.config.ts
```

Si Railway ejecuta migraciones durante el deploy, comprobar los logs y no repetirlas manualmente. Primero migrar la BD, después servir el código nuevo. La tabla nueva requiere respaldo PostgreSQL.

## Fotografías familiares

- Las nuevas fotos y las fotos que se vuelvan a subir se guardan en PostgreSQL (`familia_foto`, BYTEA, máximo 4 MiB), con actualización transaccional de la referencia en `familia`.
- Las imágenes anteriores siguen leyéndose desde `FAMILY_IMAGE_DIR` cuando el archivo exista. **Las fotos perdidas por un redeploy anterior no se pueden reconstruir con el parche**. Volver a subirlas una vez y comprobarlas después de un nuevo despliegue.
- La pantalla muestra las iniciales cuando una imagen antigua devuelve error, en vez del texto roto de la foto.
- No hace falta configurar otro volumen Railway para las nuevas fotos, aunque la base sí debe estar respaldada. Mantener autenticación para el endpoint de lectura.
- El fichero no se copia a un servidor de terceros ni a almacenamiento público.

## Reportes agrícolas

- Dirección general y Coordinación pueden **Exportar Excel**. El permiso se valida también en la API.
- Categorías: `Producción agrícola` (formato institucional existente + trazabilidad), `Ventas por cultivo` y `Detalle de ventas`.
- Se conservan los filtros por semestre, fechas, comunidad y familia.
- Las monedas GTQ/USD se contabilizan por separado, sin conversión artificial; las ventas sin importe no se inventan.

## Auditoría y control financiero

- Dirección general: acceso exclusivo a **Bitácora de operaciones**. La vista predeterminada muestra 30 días y la opción «Todo el historial» conserva los registros anteriores; no se purga ninguna bitácora por defecto. El conteo de 234 entradas no es preocupante: la consulta está paginada e indexada.
- Contadora interna y Auditor: **Control financiero**, solo lectura de ventas agrícolas reales. Resumen mensual/semestral, totales GTQ/USD, por cultivo, movimientos y Excel con tres hojas. El API devuelve datos agregados o movimientos de ventas, no el libro de bancos.
- **No se implementan ni se simulan:** cuentas por pagar, vouchers, bancos, caja chica, liquidaciones, planillas, conciliación bancaria o informe financiero institucional completo. Necesitan módulos y respaldos contables específicos.
- La API protege Bitácora con `requireDirectora` incluso si otro rol recibe accidentalmente ese permiso desde Administración.

## Habilitar cuentas y probar roles

Usar la cuenta existente **Dirección general** → **Administración → Usuarios → Nuevo usuario**, con correo individual y rol correspondiente. El sistema genera una contraseña temporal mostrada una sola vez y exige cambio personal:

1. Crear o activar la cuenta de Brenda con rol **Contadora interna**.
2. Para probar un auditor externo, crear otra cuenta con rol **Auditor** (no compartir la cuenta de Brenda).
3. Si se necesita una cuenta adicional de Dirección para pruebas, crearla desde Administración con autorización institucional, sin contraseñas en código ni seeds. **No cambiar el rol de la cuenta principal para probar**.
4. Confirmar que Dirección ve Control financiero y Bitácora; Contadora interna y Auditor solo Control financiero; Técnico no puede consultar esos endpoints.
5. Cerrar sesión y volver a entrar después de desplegar la migración de permisos.

## Pruebas de aceptación en Railway

- Editar una familia y volver a abrir el expediente. La foto debe seguir visible.
- Volver a subir una foto antigua rota; después hacer un deploy y refrescar el expediente. Debe persistir.
- Con Dirección: Reportes → seleccionar semestre → exportar las tres categorías y comprobar que Excel abre correctamente.
- Con Contadora interna y Auditor: verificar `/auditoria/control-financiero`, descargar Excel, comprobar el 403 de `/api/v1/auditoria/bitacora` (aunque se escriba la URL manualmente).
- Con Dirección: consultar bitácora últimos 30 días y «Todo el historial»; no se muestran códigos HTTP en la tabla.
- Verificar roles y permisos en la tabla `rol_permiso` tras ejecutar la migración.

La actualización no elimina familias, cosechas, ventas ni entradas de bitácora existentes. Las cuentas de prueba nunca deben usar credenciales compartidas y deben desactivarse al finalizar QA.
