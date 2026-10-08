# Configuración del ambiente de desarrollo

## Requisitos

- Node.js 24
- npm
- Git

## Instalación

Clonar el repositorio e instalar las dependencias desde la raíz:

```bash
npm install
```

## Base de datos local

La API necesita PostgreSQL en ejecución y una conexión real en
`apps/api/.env`. Usa `apps/api/.env.example` como referencia y sustituye
los valores de ejemplo. El archivo `.env` está excluido de Git.

Para el ambiente local de FAM-01 se utiliza PostgreSQL 17 en Docker:

- Contenedor: `viviendas-leon-postgres`.
- Puerto: `127.0.0.1:5432`.
- Base de datos y usuario: `viviendas_leon`.
- Volumen persistente: `viviendas-leon-postgres-data`.
- La contraseña local está en `apps/api/.env`.

Con Docker Desktop en ejecución, puedes iniciar el contenedor existente:

```powershell
docker start viviendas-leon-postgres
```

Desde `apps/api`, aplica las migraciones y, para una base de desarrollo,
carga los datos sintéticos existentes:

```powershell
npm exec -- prisma migrate deploy --config prisma7.config.ts
npm exec -- prisma db seed --config prisma7.config.ts
```

Desde la raíz del repositorio, inicia la API y el frontend con `npm run dev`.
Si cambias `apps/api/.env` mientras la API está ejecutándose, reiníciala
para que cargue la nueva configuración.

## URL de la API y despliegue

El frontend utiliza `/api` por defecto. En desarrollo, Vite redirige esas
solicitudes a `http://localhost:3000`; no hace falta crear un `.env` de web
para ejecutar el proyecto localmente.

En producción, configura el servidor o proxy inverso del dominio para
redirigir `/api` al backend. El proxy de Vite solo configura el ambiente
local, no el servidor de producción.

Si publicas la API en otro dominio, configura `VITE_API_URL` antes de
compilar el frontend, incluyendo `/api`, por ejemplo
`https://api.example.com/api`. Configura también `CLIENT_URL` en el backend
con el origen exacto del frontend para permitir CORS. `VITE_API_URL` es
una variable pública integrada durante la compilación; cambiarla requiere
recompilar. Usa HTTPS para ambos servicios en un despliegue HTTPS.
