# Despliegue temporal en Railway — ViviendasLeón

La aplicación es un monorepo npm con dos workspaces (`apps/api` y `apps/web`).

## Arquitectura

- `web`: Caddy sirve el build de Vite y reenvía `/api/*` al servicio `api` por la red privada de Railway.
- `api`: Express, Prisma 7 y workers de notificaciones; **sin dominio público**.
- `Postgres`: PostgreSQL administrado por Railway; **sin acceso público**.
- `api-storage`: volumen montado en `/data` del servicio `api` para evidencias y fotografías.

El navegador siempre usa `/api` en el **mismo origen**. No cambiar `VITE_API_URL` por el dominio privado ni por otra URL en `railway.app`; algunas solicitudes son absolutas a `/api` y la aplicación usa `credentials: 'same-origin'`.

## Precondiciones

1. Trabajar en una rama `deploy/railway`, abrir PR e integrar a `main` al validar.
2. Conectar los dos servicios al mismo repositorio y a la rama que se desea probar. Después del merge, escoger `main` en ambos.
3. En ambos servicios, mantener **Root Directory `/`**: la raíz posee `package-lock.json` y los workspaces.
4. No subir `.env`, credenciales, datos personales, imágenes ni archivos del ZIP a GitHub.

## Servicio PostgreSQL

En el canvas: `New` → `Database` → `PostgreSQL`. Nombrar el servicio exactamente `Postgres` para las referencias de este documento. Dejarlo privado, idealmente PostgreSQL 17 (coherente con desarrollo). Railway aprovisiona su propio volumen persistente. Habilitar backups.

## Servicio API

Desde `New` → `GitHub Repository`, elegir este repositorio. Renombrar el servicio **api**.

### Settings

- Source branch: `deploy/railway` durante pruebas; `main` después del merge.
- Root Directory: `/`.
- Dockerfile path: por variable de servicio `RAILWAY_DOCKERFILE_PATH=Dockerfile.api`.
- Pre-deploy command: `cd apps/api && npx prisma migrate deploy --config prisma7.config.ts`.
- Healthcheck: `/api/health`.
- No generar un dominio público para la API.
- Una sola réplica para los workers de notificaciones y las evidencias locales.

### Variables

Configurar:

```dotenv
RAILWAY_DOCKERFILE_PATH=Dockerfile.api
NODE_ENV=production
PORT=3000
DATABASE_URL=${{Postgres.DATABASE_URL}}
SESSION_SECRET=<secreto aleatorio >=32 caracteres>
CLIENT_URL=https://<dominio-web>.up.railway.app
HUERTO_IMAGE_DIR=/data/huertos
VISIT_EVIDENCE_DIR=/data/visits
TRAINING_EVIDENCE_DIR=/data/training
VAPID_PUBLIC_KEY=<clave publica propia de este entorno>
VAPID_PRIVATE_KEY=<clave privada propia de este entorno>
VAPID_SUBJECT=mailto:<correo-institucional>
```

Obtener `SESSION_SECRET` con:

```powershell
node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"
```

Generar un par VAPID **nuevo para el entorno** desde tu equipo, con las dependencias del repositorio instaladas:

```powershell
node -e "console.log(require('web-push').generateVAPIDKeys())"
```

**No** colocar placeholders como valores reales. Configurar `CLIENT_URL` cuando Railway genere el dominio web; las variables de Railway se actualizan con redeploy.

Conectar un volumen de API y montarlo en **`/data`** antes de subir evidencias.

## Servicio Web

De nuevo `New` → `GitHub Repository`, mismo repositorio, nombrar **web**.

### Settings y variables

- Root Directory: `/`.
- Dockerfile: `RAILWAY_DOCKERFILE_PATH=Dockerfile.web`.
- `PORT=8080`.
- `API_UPSTREAM=api.railway.internal:3000` (por la red privada).
- Healthcheck: `/api/health` (necesita que `api` ya esté activa).
- Networking: generar un dominio público Railway HTTPS **solo para web**, apuntando al puerto 8080.
- No hace falta definir `VITE_API_URL`: el valor por defecto `/api` es el correcto.

Los servicios de Railway tienen DNS privado `<nombre>.railway.internal`, por eso importa que el backend se llame `api` o se ajuste `API_UPSTREAM` a su nombre real.

## Primer usuario: base de datos nueva y vacía

`prisma migrate deploy` crea tablas, roles y permisos; **no crea cuentas humanas ni importa las 19 familias de desarrollo**.

El seed de desarrollo `apps/api/prisma/seed.ts` genera datos sintéticos y se niega a ejecutarse en producción. **Nunca ejecutar `prisma db seed` en producción.**

Si la base está verdaderamente vacía, crear un administrador una sola vez:

1. Agregar temporalmente en las variables de `api`: `BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_PASSWORD` (clave aleatoria de al menos 16 caracteres) y opcionalmente `BOOTSTRAP_ADMIN_NAME`.
2. Asegurarse de que `api` está desplegada y `migrate deploy` terminó correctamente.
3. Desde PowerShell con [Railway CLI](https://docs.railway.com/cli/ssh) vinculada al proyecto, ejecutar:

   ```powershell
   railway ssh -s api -e demo-main -- node apps/api/dist/scripts/bootstrap-admin.js
   ```

   Cambiar `demo-main` si el entorno se llama de otra forma.
4. Iniciar sesión en la web. La cuenta exige cambiar la contraseña en el primer acceso.
5. Eliminar las tres variables `BOOTSTRAP_ADMIN_*` y volver a desplegar la API para que el runtime no retenga esa credencial temporal.

El comando se **niega a crear cuentas si ya existe cualquier usuario**. En ese caso no usarlo; gestionar la importación de usuarios/roles mediante un procedimiento revisado.

## Pruebas de aceptación

- `https://<dominio-web>/api/health` devuelve `{"status":"ok","service":"viviendas-leon-api"}`.
- `/login` sirve HTML de la PWA, sin error 404; el login crea la cookie Secure.
- Refrescar rutas como `/familias` conserva la navegación de React Router.
- La lista de familias/huertos y las visitas consultan la base de datos de Railway.
- Subir evidencia y redeplegar **api** no la hace desaparecer (volumen `/data`).
- PWA: `manifest.webmanifest`, service worker y notificaciones HTTPS en dispositivos compatibles.
- Los logs de `api` no muestran errores de migraciones ni de workers.

## Protección de datos y continuidad

No asumir que Railway posee los datos de PostgreSQL local. Antes de importar familias reales, hacer respaldos y verificar permisos de acceso, restauración, privacidad y seguridad. No restaurar la base de desarrollo en producción sin revisar cuentas sintéticas. Desactivar acceso público TCP de PostgreSQL si se habilitó temporalmente para una migración controlada.

Al migrar a AWS: exportar y verificar respaldo de PostgreSQL; copiar `/data` a almacenamiento duradero; conservar `SESSION_SECRET` mientras se migren sesiones o forzar inicio de sesión; configurar DNS/HTTPS y claves VAPID según el diseño definitivo.
