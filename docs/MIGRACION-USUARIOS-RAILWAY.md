# MIGRACIÓN DE USUARIOS — PostgreSQL local a Railway

Este procedimiento copia **únicamente cuentas institucionales, relaciones de rol y fotos de perfil** a una base Railway **sin usuarios**. Conserva ID, correo y contraseña **hash Argon2**; los usuarios pueden iniciar sesión con su contraseña actual. No copia familias, visitas, huertos, registros, sesiones, notificaciones ni bitácoras. No ejecutar el seed sintético en Railway.

## Precondiciones

1. La API y `web` están desplegadas y las migraciones de Prisma se ejecutaron correctamente.
2. PostgreSQL local `viviendas-leon-postgres` está funcionando y `apps/api/.env` apunta a esa base en `localhost:5432`.
3. La base destino de Railway tiene **cero** usuarios; el script se detiene si detecta alguno. No ejecutar bootstrap-admin antes de migrar.
4. Local y Railway tienen las mismas migraciones institucionales de roles/permisos. El script comprueba los roles y sus permisos; solo admite las 8 diferencias de pantallas del Técnico agropecuario detectadas y omite los dos permisos SYN de pruebas.
5. Realizar un respaldo antes de la primera migración. Usar una base de staging; no sobrescribir una base con datos.

## 1. Conectar a Railway sin exponer públicamente PostgreSQL

En una ventana de PowerShell desde la raíz del repositorio:

```powershell
railway login
railway link
railway connect PostgreSQL -e demo-main --tunnel-only
```

Dejar **esa ventana abierta**. `--tunnel-only` imprime una URL local de conexión y mantiene activo el túnel SSH. No copiar ni compartir esa URL en chats, capturas, GitHub o tickets.

## 2. Vista previa (otra ventana PowerShell)

Desde la raíz del repositorio, con dependencias instaladas (`npm ci` si faltan):

```powershell
$secreto = Read-Host "Pega la URL local del túnel Railway" -AsSecureString
$env:RAILWAY_DATABASE_URL = [System.Net.NetworkCredential]::new('', $secreto).Password
Remove-Variable secreto
node .\apps\api\scripts\migrar-usuarios-railway.mjs --preview
```

El script lee `DATABASE_URL` de `apps/api/.env`, sin imprimirla; alternativamente admite `LOCAL_DATABASE_URL` como variable de entorno. Solo acepta un origen en `localhost`. Muestra totales, estados y roles, **sin imprimir usuarios, correos ni hashes**. Omite la cuenta `dev@viviendas-leon.test`, las cuentas `@pruebas.invalid` y registros con nombres marcados como sintéticos o ficticios.

Si la vista previa informa diferencias distintas de las 8 pantallas del Técnico agropecuario y los dos permisos sintéticos conocidos, roles faltantes, contraseñas sin Argon2 o usuarios existentes en Railway, **no forzar el script**: revisar el caso antes de migrar. Los ocho permisos de pantalla se agregan solo durante `--apply`, en la misma transacción que los usuarios. `--preview` muestra el plan sin escribir.

## 3. Importación

Solo si la vista previa es correcta y el destino sigue vacío:

```powershell
node .\apps\api\scripts\migrar-usuarios-railway.mjs --apply
```

La operación utiliza una transacción y hace `ROLLBACK` si falla. Conserva los IDs originales, actualiza la secuencia de usuario y enlaza las cuentas con los roles de Railway. Si faltan los 8 permisos de pantalla autorizados del rol Técnico agropecuario, agrega solo esas asociaciones de `rol_permiso` en la misma transacción. **No importa `SYN-AGRICULTURA-WRITE` ni `SYN-VISITAS-WRITE`**, porque son permisos de pruebas creados por `prisma/seed.ts`. Tras importar, verificar las operaciones de visitas con un usuario técnico: el código del backend aún reconoce `SYN-VISITAS-WRITE` como permiso heredado, además de `VISITAS_WRITE`, y puede requerir una autorización institucional específica si el rol no tiene `VISITAS_WRITE`. La creación de usuario es incompatible con un destino no vacío por diseño: no sobrescribe ni fusiona cuentas existentes.

Luego borra la variable temporal:

```powershell
Remove-Item Env:\RAILWAY_DATABASE_URL
```

Cierra el túnel con `Ctrl+C` en la primera ventana.

## 4. Verificación

- Iniciar sesión en la web Railway con una cuenta **institucional**, sin utilizar las cuentas de prueba.
- Verificar roles y acceso a los módulos autorizados.
- Comprobar que solo se migraron los usuarios previstos.
- Confirmar la foto de perfil si había una.

Los hashes son credenciales sensibles, aunque no estén en texto plano. Este procedimiento los transfiere **directamente por conexiones PostgreSQL**, sin exportar dumps, CSV ni archivos con credenciales. No publicar ninguno de los secretos de las conexiones.

## Antes de migrar otros datos

Si se decide importar familias, visitas, bitácoras y evidencias, diseñar una **migración completa y coherente de relaciones** por separado; no hacer un `pg_restore` completo sobre una base Railway que ya tiene datos sin respaldos y análisis de conflictos. El contenido de `/data` del volumen del API es independiente de los datos almacenados en PostgreSQL.


## Alternativa sin Railway CLI: TCP Proxy temporal

Si Windows bloquea Railway CLI por una politica de control de aplicaciones, **no desactives ni evadas la politica**. Puedes hacer una conexion PostgreSQL temporal desde el navegador de Railway:

1. En el panel del proyecto, abre **PostgreSQL** (no `api`) → **Settings** → **Networking** → **TCP Proxy / Public Access** y agrega el puerto interno `5432`. Aplica los cambios si Railway lo solicita.
2. En **PostgreSQL** → **Variables**, copia el valor de `DATABASE_PUBLIC_URL`. **Nunca** uses `DATABASE_URL` interna desde tu PC ni reveles la URL en capturas, tickets o chats.
3. En PowerShell, en la raiz del repositorio, usa una entrada confidencial:

   ```powershell
   $secreto = Read-Host 'Pega DATABASE_PUBLIC_URL de Railway' -AsSecureString
   $url = [System.Net.NetworkCredential]::new('', $secreto).Password
   Remove-Variable secreto
   $join = if ($url.Contains('?')) { '&' } else { '?' }
   $env:RAILWAY_DATABASE_URL = "$url${join}sslmode=require"
   Remove-Variable url, join
   node .\apps\api\scripts\migrar-usuarios-railway.mjs --preview
   ```

4. Si la vista previa identifica exclusivamente cuentas institucionales, no muestra errores de roles o permisos y el destino tiene cero usuarios, genera un respaldo de ambas bases y ejecuta `node .\apps\api\scripts\migrar-usuarios-railway.mjs --apply`.
5. Retira la variable local con `Remove-Item Env:\RAILWAY_DATABASE_URL`, desactiva **TCP Proxy / Public Access** en PostgreSQL y comprueba que `api` sigue utilizando la referencia **privada** `DATABASE_URL`.

El script solo acepta hosts `*.proxy.rlwy.net` para esta alternativa, exige un puerto explicito y `sslmode=require` (TLS). Si Railway muestra otra direccion que no coincida, revisa antes de cambiar el codigo. El cliente usa la URL publica unicamente durante la migracion. `sslmode=require` cifra el transporte pero no es equivalente a validar por completo la identidad del servidor; si tu entorno exige verificacion estricta, utiliza un certificado confiable y `verify-full` o solicita un metodo aprobado de tunel privado.


## Diferencia detectada para el rol Técnico agropecuario

El entorno local tiene ocho permisos de pantallas que Railway no asignó automáticamente al rol técnico: `PANTALLA_CONTROL_FITOSANITARIO`, `PANTALLA_FAMILIAS`, `PANTALLA_FAMILIAS_CREAR`, `PANTALLA_FAMILIAS_DETALLE`, `PANTALLA_GESTION_AGRICOLA`, `PANTALLA_VISITAS_AGENDA`, `PANTALLA_VISITAS_HISTORIAL` y `PANTALLA_VISITAS_NUEVA`. Estos corresponden a pantallas reales de `apps/web/src/features/auth/screenPermissions.ts`.

Los dos permisos `SYN-*` se crearon en `apps/api/prisma/seed.ts` como datos sintéticos; no se trasladan a Railway. La reconciliación de los ocho accesos de pantalla solo se ejecuta cuando los demás roles y permisos coinciden exactamente y el catálogo de Railway contiene todos los códigos. Si algo difiere, se cancela. La actualización y el alta de usuarios suceden en una sola transacción.
