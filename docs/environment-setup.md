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

## Registro básico de familias — FAM-02

- `/familias/nueva` permite registrar una familia desde la acción **Registrar familia** del listado.
- `POST /api/v1/familias` recibe `nombreReferencia` (obligatorio, máximo 150 caracteres), `comunidadId` (entero positivo dentro del rango de PostgreSQL), `fechaIngreso` (opcional, `YYYY-MM-DD`) y `observaciones` (opcionales, máximo 2000 caracteres).
- Los textos se recortan; el nombre no puede quedar vacío. Se rechazan propiedades adicionales, fechas inexistentes y formatos de fecha con hora o zona horaria. Los campos opcionales pueden omitirse o enviarse como `null`; una fecha vacía debe omitirse.
- La comunidad y su municipio deben existir y estar activos. `GET /api/v1/comunidades` devuelve únicamente las opciones habilitadas, con ID, nombre y municipio.
- El backend establece `ACTIVA`, PostgreSQL genera el ID y la respuesta de creación contiene `{ data: registro }` con HTTP 201.
- `GET /api/v1/familias/:id` permite consultar el registro básico. Un ID inválido devuelve 400 y uno válido sin registro devuelve 404. El detalle `/familias/:id` consulta esta API también después de recargar el navegador.
- Los errores de entrada incluyen `error.details` por campo. Los errores inesperados devuelven mensajes generales, sin detalles internos de Prisma.
- Se reutiliza el modelo actual; no se requieren migraciones, códigos adicionales ni unicidad por nombre/comunidad. Este flujo no crea integrantes ni asociaciones a programas.

### Dependencia pendiente de seguridad

La autenticación y autorización **no están implementadas para estos endpoints**. CORS no sustituye los controles de acceso. Esta funcionalidad debe utilizarse con datos sintéticos en desarrollo; no debe considerarse preparada para producción con datos reales hasta integrar autenticación y permisos tanto para creación como para consulta y catálogo.

### Verificación realizada

Comprobaciones disponibles desde la raíz:

```powershell
npm run build
npm run lint
```

Resultados de la implementación:

- TypeScript y build de API/frontend completados; lint sin advertencias.
- 68 comprobaciones funcionales de API contra PostgreSQL local: 27 cuerpos inválidos, JSON mal formado, IDs inválidos, comunidad inexistente/inactiva, municipio inactivo, tres altas exitosas, estado inicial, recorte de textos, fecha UTC, ausencia de relaciones adicionales, consulta posterior, 404 y aparición en el listado. Se verificó también que dos familias homónimas reciban IDs distintos.
- 48 comprobaciones automatizadas en Edge: campos obligatorios, foco del primer error, valores conservados tras un error de guardado simulado, bloqueo de campos/acciones, prevención de envíos simultáneos, reintento, navegación al detalle, recarga real del navegador, consulta desde el listado y mensaje de registro inexistente.
- Formulario comprobado a 320, 360, 768, 1024 y 1280 px, en temas claro/oscuro; detalle a 320, 768 y 1280 px en ambos temas. Se comprobó el ancho del contenido y el fondo de los controles. Esto no sustituye una revisión visual humana completa ni una auditoría de accesibilidad.
- Las pruebas utilizaron datos sintéticos propios y los eliminaron al finalizar. Por decisión del usuario, los scripts fueron temporales y no se incorporaron al repositorio.
