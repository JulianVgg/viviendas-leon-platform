# Familias — tercera entrega: expediente integral de solo lectura

Verificación: **2026-10-14**, hora local Guatemala; fixtures con fecha UTC
`20261015`. Rama de trabajo: `feat/families-integral-expediente`.

## Base y preparación

Por autorización explícita se cerró y publicó primero la segunda entrega:

- Commit **`7ec039c`**, mensaje exacto:
  `feat: segunda parte de nuevos formularios familias`.
- Push confirmado a `origin/feat/families-integral-wizard`, incluyendo el cierre
  QA real, los runners de pruebas y su documentación.
- `git status` limpio antes de crear la rama nueva.
- `git fetch origin`: `origin/main` en `9fea22f`, sin commits pendientes de integrar
  en la base del asistente (`git rev-list --left-right --count origin/main...HEAD`:
  `0 2`). No se ejecutó merge ni se sobrescribió trabajo local.
- Build/lint iniciales aprobados; cuatro advertencias preexistentes.

Los cambios de **esta tercera entrega no se comitean ni publican automáticamente**.

## Archivos y componentes

| Archivo | Responsabilidad |
|---|---|
| `apps/web/src/features/families/pages/FamilyDetailPage.tsx` | Carga remota, errores, reintento, conexión y sesión; misma ruta `/familias/:id` |
| `apps/web/src/features/families/components/FamilyIntegralRecord.tsx` | Encabezado, tarjetas resumen, pestañas y tablas de solo lectura |
| `apps/web/src/features/families/services/familyService.ts` | Nuevo `fetchIntegralFamily`; `FamilyApiError.code` opcional y compatible con llamadas previas |
| `apps/web/src/features/families/services/familyRecord.ts` | Formato UTC/es-GT, variantes de estado y clasificación segura de errores |
| `apps/web/tests/familyRecord.test.mjs` | Lógica y navegador Brave con HTTP simulado |
| `apps/api/tests/families-record.qa.test.mjs` | Lectura real, login y SQL QA; bloquea solicitudes no GET a Familias |
| `apps/web/tests/familyWizard.test.mjs` | Adapta únicamente el fixture del destino integral y comprueba que aparece tras el 201 |
| Este documento | Evidencias, reproducción, límites y pendientes |

Se reutilizan `PageHeader`, `PageMeta`, `Card`, `CardHeader`, `CardBody`, `Badge`,
`Alert`, `Button`, `LoadingState`, `DataTableContainer`/`DataTable` y `EmptyState`.
Se revisaron forms y UI existentes; no se necesitan controles de formulario en
un expediente de solo lectura. No había un patrón de pestañas ARIA existente;
se implementó dentro del componente del expediente, sin crear otro sistema visual.

Sin cambios en FamilyWizard, formulario básico, tipos básicos, rutas, API,
Prisma, AUTH, Sidebar, administración, visitas, capacitaciones, PWA, colas o
servicios offline. No se instalaron dependencias.

## Presentación y contenido

- Se conserva AppLayout, navegación y encabezado institucional.
- Tarjeta de identificación: nombre de referencia, comunidad, municipio, ID,
  indicador de solo lectura y badge del estado devuelto por backend.
- Tarjetas resumen: cantidad de integrantes y participaciones calculadas
  **directamente con `.length` de los arreglos recibidos**, sin estadísticas ajenas.
- **Información general:** ID, nombre, comunidad, municipio, ingreso, estado y
  observaciones con saltos de línea conservados.
- **Integrantes:** nombre completo, nacimiento, sexo, parentesco, teléfono y
  activo/inactivo. Se muestran **todos**, sin filtrar inactivos ni calcular edades.
- **Programas:** nombre, ingreso, salida, estado de participación y observaciones.
  Se identifican por separado `programaId` y el ID de la asociación. Un estado
  null muestra “Sin estado definido” con badge neutro; no se inventan estados.
- Los vacíos históricos muestran mensajes explícitos de relaciones ausentes;
  no agregan personas, programas o filas ilustrativas.

Tarjetas, bordes, colores brand/slate, tipografía, foco, espaciado y variantes
dark son los del proyecto. No se copian colores o fondos negros de la referencia
conceptual. Nombres y observaciones largos permiten ajuste incluso sin espacios.
Las tablas tienen scroll **interno**, región accesible y encabezados/caption;
no fuerzan scroll horizontal del documento. No hay botones de edición o creación.

## Contrato, sesión y privacidad

Se reutiliza el tipo frontend `IntegralFamilyRecord` existente, compatible con
`apps/api/src/modules/families/families-integral.types.ts`:

```text
GET /api/v1/familias/:id/expediente
200 { data: IntegralFamilyRecord }
```

Referencia: [contrato de API integral](families-integral-api.md).
`fetchFamily` y el GET básico permanecen disponibles para consumidores anteriores.
La nueva pantalla no hace fallback al básico si falla el integral.

El servicio usa el endpoint AUTH existente `GET /api/v1/auth/me` antes de consultar
el expediente, con cookies same-origin y sin tocar AuthProvider. La identidad se
valida usando la sesión actual, no RoleContext ni otro almacén de autenticación.
Esto también permite detectar una sesión expirada al recargar/reintentar aunque
el gate temporal integral por sí solo no valide identidad.

Ambas consultas usan `cache: 'no-store'` y AbortSignal. El expediente solo vive en
memoria React: no se llama a `fetchFamilyWithOffline`, IndexedDB, localStorage,
sessionStorage ni colas. No se cambia la caché básica de desarrollo compartida.
El test de navegador inspecciona los almacenes y confirma ausencia de los nombres,
teléfono y fecha de nacimiento sintéticos del expediente.

Cambiar de ID, reintentar o recuperar conexión monta una solicitud nueva, evitando
mostrar el expediente anterior durante la carga. Al perder conexión se retira
el contenido integral y se indica que no existe copia local; al recuperar conexión
se vuelve a consultar. No hay detección continua adicional de expiración mientras
la página permanece inactiva: se usa el ciclo de sesión existente y se comprueba
antes de cada nueva consulta. No se modifica AUTH.

## Fechas, errores y accesibilidad

`formatRecordDate` usa `Intl.DateTimeFormat('es-GT', { timeZone: 'UTC', ... })`.
Por ejemplo `2000-01-15T00:00:00.000Z` muestra **15/01/2000**, no el día anterior
en Guatemala. Null/vacío → “Sin fecha”; valor ilegible → “Fecha no disponible”,
nunca “Invalid Date”. No se calculan edades ni fechas derivadas.

| Estado | Presentación |
|---|---|
| Cargando | `LoadingState`: Consultando expediente integral... |
| Sin conexión | Aviso sin datos integrales, reanudación al reconectar |
| 400 | Identificador no válido; volver al listado |
| 401 | Sesión expirada/no válida y enlace al login; sin datos anteriores |
| 403 | Acceso denegado |
| 404 + `FAMILY_NOT_FOUND` | Expediente inexistente |
| 404 + `NOT_FOUND` | Servicio integral deshabilitado |
| 404 desconocido | Servicio no disponible; **no se afirma que la familia no exista** |
| 500 | Error interno genérico, sin texto técnico del backend |
| Error de red | Conexión fallida y reintento GET explícito |
| Arreglos vacíos | Sin integrantes / sin programas, cantidades cero |

`FamilyApiError.code` se conserva desde el envelope del backend sin romper la
firma anterior (cuarto argumento opcional). La UI no muestra mensajes internos
arbitrarios de errores generales. Los errores reciben foco.

Pestañas: `tablist` horizontal, tres botones `tab`, `aria-selected`,
`aria-controls`, IDs únicos con `useId` y paneles `tabpanel` con `aria-labelledby`.
Roving tabindex: solo la pestaña seleccionada está en la secuencia Tab. Flechas
izquierda/derecha activan y enfocan, con recorrido circular; Home/End van a los
extremos; Tab pasa al panel activo, que tiene foco visible. Los otros paneles
usan `hidden`. Todas las relaciones están precargadas: cambiar pestaña no dispara
otras consultas ni pierde contenido.

## Pruebas ejecutadas en esta rama

Se utilizó **Brave**, instalado previamente, con perfiles temporales aislados y
CDP nativo. No se instaló Playwright ni otra librería.

| Suite | Aprobadas | Fallidas | Omitidas |
|---|---:|---:|---:|
| Expediente: lógica + Brave con HTTP simulado | 12 | 0 | 0 |
| Regresión del asistente: lógica + Brave con HTTP simulado | 17 | 0 | 0 |
| Backend unitario/HTTP, conexiones PostgreSQL bloqueadas | 40 | 0 | 0 |
| Expediente con sesión, HTTP y SQL QA reales | 6 | 0 | 0 |
| Regresión real del asistente y módulos existentes | 16 | 0 | 1 |
| **Total final de esta tarea** | **91** | **0** | **1** |

Los conteos son los reportados por `node:test`, incluidos tests contenedores.
No se suman repeticiones. La omisión corresponde a sincronización offline real:
falta `offline_demo_note` en QA, igual que en el cierre anterior. No se ejecutaron
migraciones de ese módulo. La suite API de 26 casos fue verificada en el cierre
`7ec039c`; no se cuenta como ejecutada nuevamente en esta entrega, que no cambia API.

### HTTP simulado (no acredita persistencia)

- Dos integrantes, incluyendo inactivo, y dos programas con IDs de asociación
  distintos de los IDs de programa; cantidades derivadas de los arreglos.
- Familia sin relaciones, datos opcionales null, fechas UTC reales, estados
  conocidos/desconocidos, nombres sin espacios de hasta 500 caracteres en miembros
  y observaciones largas dentro de los fixtures permitidos por contrato.
- Carga, todos los estados HTTP de la tabla anterior, fallo de red, recuperación,
  desconexión/reconexión y recarga con nueva petición.
- El texto interno de error simulado no aparece en pantalla; sin fallback básico
  y sin ningún POST de Familias desde la pantalla de consulta.
- Enlaces ARIA, roving tabindex, flechas, Home/End, Tab al panel, tablas y vacíos.
- **3 pestañas × 5 resoluciones (320, 375, 768, 1024, 1440 px) × 2 temas**:
  sin scroll horizontal global, esperando la transición responsive del layout
  existente antes de medir. El desplazamiento interno de las tablas es intencional.
- Almacenes del navegador sin nombres, teléfono ni nacimiento del expediente.
- El fixture de redirección del asistente ahora proporciona el expediente integral;
  se comprueba que aparecen sus pestañas después del 201, no solo el cambio de URL.

### QA real: aislamiento previo, sesión y solo lectura de Familias

Antes de cualquier escritura del runner se verificó nuevamente:

- Contenedor `viviendas-leon-qa-postgres` activo, imagen `postgres:17`.
- Puerto efectivo **127.0.0.1:5433**, base **viviendas_leon_qa**, usuario
  **viviendas_qa** y puerto interno 5432, con SQL inicialmente read-only.
- Volumen **viviendas-leon-qa-data** exclusivo, inspeccionando todos los contenedores;
  separado de `viviendas-leon-postgres` y de su puerto habitual 5432.
- `DATABASE_URL` fijo de QA configurado antes del import de `app`; identidad
  efectiva Prisma igual a la SQL independiente. La URL y contraseña no se imprimen.
- Secreto de sesión de 48 bytes aleatorios solo en memoria, `NODE_ENV=qa`,
  `ENABLE_FAMILY_INTEGRAL_API=true`; API y Vite propios ligados a loopback.
- Hash del `.env` habitual y huella del contenedor habitual antes/después idénticos.
  No se abre conexión a la base habitual.
- Fingerprints de todas las filas públicas preexistentes antes/después: conservados,
  incluyendo N01 y todos los QA anteriores. Sin seed, reset, borrado ni migración.

El runner nuevo crea únicamente una **cuenta sintética propia**, Argon2 real,
contraseña aleatoria en memoria y dominio `example.invalid`, sin roles inventados.
Se usa el formulario de login real y las sesiones existentes. Las escrituras
necesarias son cuenta propia, `ultimo_acceso` propio y su sesión. Después de crear
la cuenta, la conexión SQL independiente vuelve a read-only. No se alteran familias,
personas, programas ni asociaciones de pruebas anteriores.

El navegador real no usa interceptación HTTP. El servidor de pruebas bloquea
cualquier solicitud no GET a `/api/v1/familias*`; el contador final es **0**.
Se consultaron y compararon con SQL:

| Ejecución de lectura | Cuenta sintética nueva | Familia múltiple | Histórica sin relaciones | Resultado |
|---|---:|---:|---:|---|
| Primera | 6 | 58, dos integrantes/dos programas | 1 | 6/6 aprobadas |
| Final, después de registrar otra familia | 8 | 61, dos integrantes/dos programas | 1 | 6/6 aprobadas |

El último runner recibió **7 GET integrales** (incluidos errores de prueba),
cero solicitudes de escritura de Familias y conservó todas las filas anteriores.
Login, cantidades, nombres, IDs de asociación/programa, paneles vacíos y recarga
se verificaron con respuestas reales. El logout elimina la sesión propia.

Errores reales: 400 de ID inválido, `FAMILY_NOT_FOUND`, gate QA `NOT_FOUND`,
401 de sesión expirada antes del GET. El 500 es **inducido** mediante dependencia
Prisma solo en el runner, sin sustituir HTTP ni cambiar código de aplicación.
El **403 solo se prueba con HTTP simulado**: la API aún no implementa autorización
completa por rol; no se eliminan controles ni se atribuyen permisos a roles simulados.

### Compatibilidad con el registro integral

Se ejecutó también el runner real existente del asistente en esta rama, sin
modificarlo. Resultado: **16 aprobadas y 1 omisión offline ya indicada**.
Se mantuvieron las fixtures propias de ese runner, sin tocar registros anteriores:

- Prefijo `QA_WIZARD_20261015_00e2217d-874d-4b8c-a453-d9a03cc72401`.
- Usuario 7, municipio 15, comunidad 19; programas existentes 1 y 2.
- Familias **61 y 63**; la primera con dos integrantes/dos programas, un POST y
  201 tras doble clic. La segunda acredita recuperación de errores.
- La redirección abre el nuevo expediente, permite recargarlo y conserva la
  consulta básica de API utilizada por consumidores anteriores.
- Regresiones de búsqueda, filtros, paginación, Sidebar, login/logout y caché/cola
  offline continúan aprobadas en el alcance descrito por el runner anterior.

No se promete idempotencia de red. La prueba de transporte del asistente corta
la conexión antes del handler; la pérdida de un 201 posterior al commit sigue
sin acreditarse, tal como documenta el cierre anterior.

## Build, lint y reproducción

Build/lint iniciales y finales aprobados. Lint mantiene únicamente las cuatro
advertencias previas en `AuthProvider`, `OfflineSyncTestPage`, `VisitRegisterPage`
y `VisitAgendaPage`; no se modificaron esos módulos ni se silenciaron reglas.
Lint adicional del runner QA aprobado. `git diff --check` aprobado; los avisos
informativos LF/CRLF de Git no son fallos de whitespace.

```powershell
npm run build
npm run lint
npm run test -w @viviendas-leon/api
```

Para las pruebas frontend, iniciar Vite en una terminal:

```powershell
npm run dev -w @viviendas-leon/web -- --host 127.0.0.1 --port 5174 --strictPort
```

En otra terminal (Node 25 con soporte TS nativo, Brave instalado):

```powershell
$env:RUN_FAMILY_RECORD_BROWSER = 'true'
$env:FAMILY_RECORD_URL = 'http://127.0.0.1:5174'
node --test apps/web/tests/familyRecord.test.mjs

$env:RUN_FAMILY_WIZARD_BROWSER = 'true'
$env:FAMILY_WIZARD_URL = 'http://127.0.0.1:5174'
node --test apps/web/tests/familyWizard.test.mjs
```

Para lectura QA real, con el contenedor autorizado ya iniciado:

```powershell
$env:QA_PASSWORD_FILE = 'C:\ruta-protegida\postgres-password.txt'
$env:RUN_FAMILY_RECORD_REAL_QA = 'true'
node --test apps/api/tests/families-record.qa.test.mjs

# Regresión real opcional: agrega fixtures sintéticas propias y las conserva.
$env:RUN_FAMILY_WIZARD_REAL_QA = 'true'
node --test apps/api/tests/families-wizard.qa.test.mjs

npm exec --no -- oxlint apps/api/tests/families-record.qa.test.mjs
git diff --check
```

Los runners reales administran y cierran sus API/Vite/Brave propios. No requieren
servidor manual ni cargan `.env` de API. `BRAVE_PATH` permite indicar otra ubicación
del ejecutable sin instalar nada. Los perfiles son temporales, separados del
perfil personal. El contenedor QA se deja activo para reproducción.

## Limitaciones y pendientes

- **GO para revisión funcional en QA aislada con datos sintéticos; NO-GO para
  producción/datos personales reales.** El gate temporal no es autorización.
  Se conserva la dependencia del equipo AUTH para autorización backend por rol.
- El preflight de sesión mejora la consulta en el cliente, pero no protege el
  endpoint frente a clientes directos ni elimina la deuda de seguridad backend.
- No se acredita 403 real, auditoría completa con lector de pantalla, revisión
  visual manual mediante capturas ni instalación PWA en dispositivos.
- La sincronización offline real sigue omitida por tabla QA ausente; no pertenece
  al expediente integral y no se habilita almacenamiento offline de datos personales.
- Edición y modales de familia/integrantes/participaciones quedan fuera de esta
  entrega. Antes de implementarlos deben acordarse contratos PATCH/PUT, permisos,
  catálogo institucional de estados, validación y concurrencia. No se anticipan
  acciones visuales de edición sin esos contratos.
- Sin nuevas escrituras del expediente desde su pantalla; sin cambios en contrato
  API, Prisma, módulos ajenos o diseño institucional.

Tercera entrega preparada para revisión, **sin commit/push/merge de sus cambios**.
