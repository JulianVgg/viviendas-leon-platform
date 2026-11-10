# Clonar PostgreSQL local en una NUEVA base Railway (staging)

Este procedimiento mantiene intacta la base Railway actual (usuarios institucionales ya importados). No restaura encima de una base con tablas, no modifica `api.DATABASE_URL` y no borra datos.

**No es una depuración de datos:** la copia incluye usuarios de prueba, registros sinteticos del seed, bitácoras, sesiones, notificaciones y todos los datos que existan en PostgreSQL local. **No activar como base de produccion antes de separar y revisar los registros de prueba.**

## Preparación

1. Verificar Docker Desktop y el contenedor `viviendas-leon-postgres`; iniciarlo con `docker start viviendas-leon-postgres` si hace falta.
2. Confirmar que `apps/api/.env` apunta a `localhost:5432/viviendas_leon`, no a Railway. El script se niega a usar una URL de origen que no sea local.
3. En Railway, crear otro servicio `Database` → `PostgreSQL`; nombrarlo `PostgreSQL-migracion`. Dejar `api` y su `DATABASE_URL` conectados a la base original.
4. Comprobar que el servicio nuevo es PostgreSQL 17 o una versión compatible, está vacío y su volumen está asociado. En `PostgreSQL-migracion` activar temporalmente `Settings` → `Networking` → `Add Public Access` (puerto interno 5432). Aplicar el cambio.
5. Obtener `DATABASE_PUBLIC_URL` **del servicio nuevo**, no de la base original. No copiar la plantilla `${{...}}` literal, sino su valor resuelto. No compartir la URL con terceros.

## Comandos desde PowerShell (raíz del repositorio)

En esta MISMA terminal introducir la conexión real del nuevo servicio:

```powershell
$secreto = Read-Host "DATABASE_PUBLIC_URL de PostgreSQL-migracion" -AsSecureString
$env:RAILWAY_NUEVA_DATABASE_URL = [System.Net.NetworkCredential]::new('', $secreto).Password
Remove-Variable secreto
```

Primero, solo lectura:

```powershell
node .\apps\api\scripts\migrar-base-completa-railway.mjs --preview
```

Crear respaldo íntegro local en `C:\Users\<usuario>\Documents\ViviendasLeon-Respaldos` (sin colocarlo en el repositorio):

```powershell
node .\apps\api\scripts\migrar-base-completa-railway.mjs --backup
```

Copia la ruta exacta `.dump` que aparezca. Entonces, y **solo en el servicio nuevo vacío**:

```powershell
node .\apps\api\scripts\migrar-base-completa-railway.mjs --restore "C:\Users\LEGION\Documents\ViviendasLeon-Respaldos\ARCHIVO-REAL.dump"
```

Valida todas las cantidades de filas:

```powershell
node .\apps\api\scripts\migrar-base-completa-railway.mjs --verify
```

Los comandos `--preview` y `--verify` no escriben; `--backup` solo genera un dump local; `--restore` modifica EXCLUSIVAMENTE el destino nuevo si no tiene ninguna tabla de usuario. `pg_restore` usa `--single-transaction` y aborta ante errores.

## Revisión obligatoria ANTES de cambiar la API

- Verificar si hay 4 usuarios de pruebas, familias sintéticas, datos ficticios y los permisos `SYN-*`; la copia los preserva. **No activar esa base públicamente hasta definir y ejecutar una depuración auditada.**
- Comparar permisos del técnico y cuentas institucionales. La copia traerá exactamente los roles y permisos locales, que podrían diferir de Railway actual.
- Verificar nombres, integridad de familias y los ciclos de los huertos; comparar al menos una visita y una capacitación con la fuente local.
- Revisar `apps/api/prisma/migrations` y `migrate status` antes de cambiar `api.DATABASE_URL` (el dump contiene `_prisma_migrations`).
- Revisar la actualización del frontend/backend: su versión de código debe ser compatible con la estructura restaurada.

## Evidencias fuera de PostgreSQL

Las fotos en `usuario_foto_perfil.contenido` (Bytes) sí viajan con el dump. En cambio, los archivos locales bajo `apps/api/storage/huertos`, `apps/api/storage/visits` y `apps/api/storage/training` no están en PostgreSQL; el dump solo guarda sus rutas relativas. Para disponer de ellos en Railway es necesario copiarlos al volumen existente del servicio `api`, respectivamente a `/data/huertos`, `/data/visits`, `/data/training`, conservando los nombres y subdirectorios originales. Hasta completar esto, las referencias podrían devolver 404.

## Activación (solo después de depurar y verificar)

1. Hacer una copia de seguridad de la base Railway actual y detener escrituras durante el cambio.
2. En `api` → `Variables`, cambiar `DATABASE_URL` a la **referencia privada** del servicio nuevo, p. ej. `${{PostgreSQL-migracion.DATABASE_URL}}` si ese es su nombre exacto. No utilizar `DATABASE_PUBLIC_URL` en el backend.
3. Revisar `Pre-deploy`: Prisma `migrate deploy` podrá aplicar cualquier migración pendiente; conviene inspeccionar `migrate status` antes del primer despliegue.
4. Aplicar el redeploy de `api`, verificar `/api/health`, login y módulos con usuarios institucionales. No cambiar `web`, que conserva el mismo proxy.
5. Mantener la base Railway anterior como respaldo hasta terminar las pruebas; no eliminarla.

## Limpieza

```powershell
Remove-Item Env:\RAILWAY_NUEVA_DATABASE_URL -ErrorAction SilentlyContinue
```

Desactivar el Public Access de `PostgreSQL-migracion` (y el proxy antiguo, si sigue habilitado). Rotar las credenciales previamente expuestas, revisar las referencias de entorno y habilitar backups programados. Los `.dump` contienen datos personales: guardarlos de forma cifrada, con acceso restringido, y nunca subirlos a GitHub.

## Limitaciones

Este proceso duplica el contenido de una base local en staging; no fusiona bases ni omite registros de prueba. No incluye archivos del disco, colas offline en IndexedDB de los teléfonos o suscripciones push funcionales en los nuevos dispositivos. La verificación de filas no sustituye la validación funcional ni la auditoría del padrón oficial.
