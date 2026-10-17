# API de registro integral de familias — primera entrega

## FAM-03 y FAM-05 — actualización 2026-10-16

Se añadieron contratos autenticados de administración, protegidos por el permiso
persistido `FAMILIAS_WRITE` (asignado únicamente al rol coordinador del seed):

| Método y ruta | Operación |
|---|---|
| `PATCH /api/v1/familias/:id` | Actualiza únicamente nombre, comunidad, fecha de ingreso y observaciones |
| `POST /api/v1/familias/:id/integrantes` | Crea un integrante con `Idempotency-Key` UUID v4 |
| `PATCH /api/v1/familias/:id/integrantes/:integranteId` | Actualiza campos personales sin cambiar IDs |
| `PATCH /api/v1/familias/:id/integrantes/:integranteId/estado` | Activa o desactiva lógicamente |

Los expedientes incluyen `version` para la familia y cada integrante. El token
proviene de `xmin` de PostgreSQL y debe devolverse en todo PATCH; la comparación
se realiza bajo bloqueo transaccional y una versión obsoleta devuelve 409. No se
requiere migración de esquema. Cada mutación genera una fila de `bitacora` dentro
de la misma transacción.

El estado de familia permanece **solo lectura**: las transiciones entre `ACTIVA`,
`RETIRADA` y `EGRESADA` siguen pendientes de reglas institucionales y no se
aceptan en el PATCH. La desactivación de integrantes es lógica y se rechaza si
dejaría a la familia sin al menos un integrante activo. No se eliminan relaciones
históricas. El alta usa la bitácora y un bloqueo asesor como comprobante
idempotente; reutilizar la clave con otro contenido devuelve 409.

Fecha de verificación: **2026-10-14**. Rama: `feat/families-integral-api`,
base `feat/tailadmin-pro-families` (`9b3ffe4`). Implementación aditiva de
backend; no incluye asistente visual, modales, cambios offline ni AUTH.

## Seguridad vigente

Las rutas de familias, registro integral y expediente requieren la sesión real
de Express. Las consultas y el registro integral existente requieren identidad
autenticada; las rutas nuevas de edición exigen `FAMILIAS_WRITE`. El selector visual de roles,
`RoleContext`, `NODE_ENV` y `ENABLE_FAMILY_INTEGRAL_API` no conceden acceso.

Sin sesión se devuelve 401 y sin permiso persistido se devuelve 403. Como no
existe un modelo verificable de familias asignadas al personal de campo, sus
escrituras de edición se deniegan por defecto. El seed declara `FAMILIAS_WRITE` únicamente
para coordinación, pero no se ejecuta automáticamente ni modifica bases ya
existentes. Dirección requiere una asignación administrativa real del permiso.

## Endpoints

| Método y ruta | Resultado |
|---|---|
| `POST /api/v1/familias/registro-integral` | 201, expediente completo y `Location` del expediente |
| `GET /api/v1/familias/opciones/programas` | 200, programas seleccionables ordenados por nombre e ID |
| `GET /api/v1/familias/:id/expediente` | 200, información general, integrantes y programas |

### Registro integral

Obtener primero IDs reales mediante `GET /api/v1/comunidades` y el catálogo
de programas. Los IDs del ejemplo **no se deben asumir existentes**:

```json
{
  "nombreReferencia": "QA FAMILY INTEGRAL",
  "comunidadId": 1,
  "fechaIngreso": "2026-10-13",
  "observaciones": "Prueba sintética",
  "integrantes": [
    {
      "nombreCompleto": "QA PERSON ONE",
      "fechaNacimiento": "2000-01-15",
      "sexo": "F",
      "parentesco": "Representante"
    }
  ],
  "programas": [
    {
      "programaId": 1,
      "fechaIngreso": "2026-10-13",
      "estado": "ACTIVO"
    }
  ]
}
```

Campos opcionales del integrante: `fechaNacimiento`, `sexo`, `parentesco`,
`telefono`, `observaciones`. Campos opcionales de participación:
`fechaIngreso`, `fechaSalida`, `estado`, `observaciones`.

### Respuesta / contrato de expediente

La respuesta es `{ "data": expediente }`. `IntegralFamilyRecord` está
declarado explícitamente en
`apps/api/src/modules/families/families-integral.types.ts`:

- `id`: ID generado por PostgreSQL, no por el cliente.
- `nombreReferencia`, `fechaIngreso`, `estado`, `observaciones`.
- `comunidad`: `{ id, nombre, municipio: { id, nombre } }`.
- `integrantes`: `{ id, nombreCompleto, fechaNacimiento, sexo, parentesco,
  telefono, observaciones, activo }[]`.
- `programas`: `{ id, programaId, programa: { id, nombre }, fechaIngreso,
  fechaSalida, estado, observaciones }[]`; el `id` exterior identifica la
  **asociación**, no el programa.

Las fechas recibidas son `YYYY-MM-DD`; las devueltas son ISO UTC con medianoche,
por ejemplo `2000-01-15T00:00:00.000Z`, igual que la API básica. Los opcionales
vacíos/ausentes admitidos se devuelven como `null`. Los integrantes se ordenan
por ID y las asociaciones por nombre de programa e ID. No se incluyen usuarios,
credenciales, visitas, agricultura, insumos ni otras relaciones.

Además se exportan `FamilyMemberInput`, `FamilyProgramInput` e
`IntegralFamilyInput` para datos **normalizados del servicio** (fechas `Date`
o `null`, no payload JSON), y `FamilyProgramOption` para el catálogo JSON.

### Catálogo de programas

```json
{
  "data": [
    { "id": 1, "nombre": "QA PROGRAM", "descripcion": null, "estado": "ACTIVO" }
  ]
}
```

Consulta `Programa` real; solo ofrece `estado = 'ACTIVO'`. Ese valor está
presente en el seed institucional existente. La QA conservada de N01 no tenía
programas ni asociaciones; no se dedujo otro estado de una base vacía.
Prisma usa `String` para `Programa.estado` y `String?` para participación,
sin enum ni catálogo documentado adicional. Se acepta el estado de participación
como texto opcional: no se inventan estados ni transiciones; omitirlo guarda
`null`. No se filtra por fechas del programa ni se agrega una regla de fechas
de nacimiento futuras. Confirmar con la institución cualquier futura ampliación
de estados seleccionables. Este endpoint no crea ni administra programas.

## Validaciones y errores

- Objeto JSON y propiedades conocidas únicamente, también en cada elemento.
- Familia: nombre recortado obligatorio, máximo 150; comunidad entero positivo
  dentro de `Int` PostgreSQL; comunidad y municipio existentes y activos;
  observaciones de familia texto opcional, máximo 2000.
- `integrantes` y `programas`: arreglos obligatorios, mínimo un elemento cada uno.
  El servicio también verifica ambos mínimos antes de acceder a la base.
- Integrantes: objeto y nombre completo recortado no vacío; opcionales con tipos
  correctos; `activo=true` asignado por servidor. No se acepta `familiaId`,
  `id` ni `activo` del cliente.
- Participación: `programaId` entero positivo dentro de `Int`, existente y
  seleccionable; IDs sin repetición. No se acepta `familiaId` ni `id`.
- Fechas reales `YYYY-MM-DD`, sin hora, año cero ni rollover de fechas
  inexistentes. Se recortan espacios exteriores de manera consistente.
  Si ambas fechas de participación existen, salida no anterior a ingreso.
- Opcionales omitidos/`null` se normalizan a `null`; textos recortados vacíos
  también. Una fecha vacía es inválida: debe omitirse o enviarse como `null`.
- No se restringen sexo/parentesco/estado a enumeraciones no documentadas ni
  se agregan límites de longitud a nombres/textos de integrantes/participación
  que el esquema no define. Sigue vigente el límite global de JSON de Express.
- Estado inicial de familia siempre `ACTIVA`. No se exige unicidad de
  nombre/comunidad: familias homónimas son válidas.

Ejemplo de error HTTP 400:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Revisa los datos del expediente.",
    "details": [
      { "field": "integrantes[0].nombreCompleto", "message": "El nombre completo es obligatorio y no puede estar vacío." }
    ]
  }
}
```

| HTTP | Significado / código |
|---|---|
| 400 | Datos, referencias o ID inválidos: `VALIDATION_ERROR`, detalles por campo |
| 404 | Expediente inexistente: `FAMILY_NOT_FOUND` |
| 500 | Creación: `FAMILY_INTEGRAL_CREATE_ERROR` |
| 500 | Consulta: `FAMILY_INTEGRAL_DETAIL_ERROR` |
| 500 | Catálogo: `FAMILY_PROGRAM_OPTIONS_ERROR` |

Los errores inesperados no exponen Prisma, SQL ni stack traces al cliente.
No registrar cuerpos con datos reales; los logs del servidor siguen requiriendo
gestión segura cuando se implemente autenticación real.

## Atomicidad, referencias y consultas

1. Validar el request y verificar referencias con Prisma, sin escrituras.
2. Abrir `$transaction` interactiva.
3. Revalidar comunidad y municipio bajo `FOR SHARE OF c, m`, preservando la
   protección del POST básico; bloquear programas seleccionables con `FOR SHARE`
   en orden de ID. Las referencias se comprueban nuevamente dentro del bloqueo.
4. Crear familia, integrantes con `familiaId` generado y `activo=true`, y
   asociaciones con ese mismo ID. No se utiliza `skipDuplicates`.
5. Recuperar y serializar el expediente **dentro de la transacción**, para que
   también una falla en esa lectura revierta toda el alta.
6. Confirmar la transacción y devolver 201 únicamente después de su éxito.

Se usan Prisma y SQL parametrizado con tagged templates/`Prisma.sql` y
`Prisma.join`; no hay concatenación de datos del request en SQL. Se conserva
la restricción única `(familiaId, programaId)`, relaciones e índices existentes.
Los select omiten información innecesaria. La creación lee los grupos general,
integrantes y asociaciones secuencialmente en un número fijo de consultas,
no una consulta por persona/programa. Esto evita consultas concurrentes en la
conexión única de `adapter-pg` dentro de la transacción. El GET usa un select
relacional Prisma. No se modificaron esquema ni migraciones.

## Retrocompatibilidad e idempotencia pendiente

Permanecen los contratos y la paginación de `GET /api/v1/familias`,
`POST /api/v1/familias`, `GET /api/v1/familias/:id`, `GET /api/v1/comunidades`
y `GET /api/health`. Las rutas de familias ahora requieren autenticación y
permisos persistidos; el feature flag histórico ya no habilita ni deniega acceso.

**Excepción temporal:** el POST básico continúa permitiendo familias sin
integrantes/programas. La obligatoriedad mínima se garantiza en el registro
integral, **no universalmente** mientras exista la ruta antigua. El expediente
puede consultar familias históricas/básicas con arreglos vacíos, incluso retiradas
o egresadas (RN-011). No se elimina historia por estado.

No existe prevención global de duplicados entre dos POST independientes,
incluidos reintentos del integral. Una respuesta perdida después del commit
puede originar otra familia si se reintenta. Para esa garantía futura se
necesita idempotencia acordada con frontend/backend y almacenamiento de claves;
no se debe sustituir por unicidad de nombre/comunidad.

## Pruebas reproducibles

Desde la raíz, sin dependencias adicionales:

```powershell
npm run test -w @viviendas-leon/api
npm run build
npm run lint
npm exec --no -- oxlint apps/api/src/modules/families apps/api/tests
git diff --check
```

`npm run lint` existente solo cubre web; el comando adicional cubre los
archivos backend/pruebas de familias. Las pruebas unitarias usan `node:test`,
incluyen HTTP en loopback/puerto efímero y no se conectan a PostgreSQL.

Para QA, Docker debe estar disponible y el contenedor QA existente iniciado.
No volver a ejecutar el setup N01: sus datos se conservan. En terminal dedicada:

```powershell
$env:RUN_FAMILY_INTEGRAL_QA = 'true'
$env:QA_PASSWORD_FILE = 'C:\ruta-protegida\postgres-password.txt'
npm run test:qa -w @viviendas-leon/api
```

También puede suministrarse `TEST_DATABASE_URL` mediante un gestor seguro
de secretos. Nunca imprimir esa URL. El runner rechaza parámetros adicionales
de conexión y cualquier destino distinto de host `127.0.0.1`, puerto `5433`,
base `viviendas_leon_qa`, usuario `viviendas_qa`. No carga `apps/api/.env`.

Antes de habilitar escrituras confirma contenedor PostgreSQL 17, puerto publicado,
volumen exclusivo `viviendas-leon-qa-data` no compartido con otros contenedores,
identidad SQL en conexión inicialmente read-only e identidad efectiva de Prisma.
Solo entonces asigna `DATABASE_URL` en su propio proceso e inicia Express
en loopback/puerto efímero. La base habitual del host 5432 nunca se utiliza.
Sin `RUN_FAMILY_INTEGRAL_QA=true` la prueba se omite: **una omisión no acredita QA**.

El runner consulta catálogos reales, reutiliza opciones activas y crea solo los
programas sintéticos que faltan para probar dos asociaciones. Genera fixtures
mínimas de municipio/comunidad con prefijo único para escenarios inactivos.
Registra todos los IDs propios al finalizar y **los conserva**, sin limpieza
global ni DELETE. Cada repetición agrega fixtures con otro prefijo. Compara
todos los registros preexistentes de las seis tablas antes/después, además de
la huella del entorno habitual y del `.env`. Cambios transitorios de fixtures
propias se restauran; probes de bloqueo/cambio de programa hacen rollback.
No ejecuta migrate reset, DROP, TRUNCATE, seed, migraciones ni db push.

## Resultados ejecutados y evidencia

Verificación exclusiva contra PostgreSQL **17.11**, contenedor
`c9878fa14e02cabacc4503a076f53cc3aeab03a401c0a49b94696d875f84f815`,
base/usuario `viviendas_leon_qa` / `viviendas_qa`, volumen `viviendas-leon-qa-data`,
puerto publicado `127.0.0.1:5433` (5432 **interno**, no el habitual del host).
La identidad se confirmó tanto con SQL independiente como con Prisma.

| Verificación | Resultado |
|---|---|
| Unitarias / HTTP sin BD | 40 pruebas aprobadas |
| Integración final real | 26 pruebas aprobadas: 25 casos y el test contenedor; ninguna omitida |
| Build raíz | Aprobado, API y web |
| Lint raíz y adicional de familias backend | Aprobados |
| `git diff --check` | Aprobado; avisos LF/CRLF de Git no bloqueantes |
| Regresiones básicas | Ninguna detectada en los contratos comprobados |
| Esquema, migraciones, frontend, PWA/offline | Sin modificaciones |

Casos QA: catálogo real; alta simple/múltiple; arreglos vacíos; nombre vacío;
programa/comunidad inexistentes; comunidad/municipio inactivos; programas
repetidos; fechas imposibles; propiedades desconocidas con rutas por campo;
integridad relacional y expediente comparado con SQL; rollback después de
escribir familia, integrantes y una asociación parcial; revalidación de
comunidad/programa; bloqueo real de actualizaciones concurrentes sobre comunidad,
municipio y programa; rollback ante fallo de lectura del expediente; 404/400;
500 sin detalles internos; POST básico y homónimos; listado/paginación, detalle,
comunidades y health; bloqueo productivo incluso con flag; conservación previa.

Hubo tres ejecuciones QA, sin eliminar datos entre ellas:

| Prefijo `QA_INTEGRAL_20261014_…` | Municipios | Comunidades | Programas creados | Familias |
|---|---|---|---|---|
| `e16ed50f-083e-4626-9605-c58fe35a3808` | 2, 3 | 2, 3, 4 | 1, 2 | 27, 28, 30, 31 |
| `ecbadb08-e607-42ad-97cf-3b26054fc359` | 4, 5 | 5, 6, 7 | Ninguno | 32, 33, 36, 37 |
| `908c945a-36f6-4388-bb2b-703e0300c20b` | 6, 7 | 8, 9, 10 | Ninguno | 38, 39, 42, 43 |

Los saltos de secuencia son normales: PostgreSQL no revierte secuencias al
hacer rollback. Los registros N01 (municipio/comunidad 1 y familias 1–26) y
todos los datos anteriores a cada ejecución se comprobaron intactos. No se
ejecutaron consultas SQL de prueba contra la base habitual; solo se inspeccionó
su metadata Docker y el hash de configuración/archivo de entorno. Esto acredita
las operaciones de esta tarea, no audita otros procesos del usuario.

Las primeras dos ejecuciones emitieron una deprecación de `pg` por consultas
relacionales paralelas en una transacción de Prisma. Se reprodujo con una
transacción **read-only** y se corrigió la lectura de creación secuencialmente,
sin cambiar dependencias/esquema. La ejecución final no emitió esa advertencia.
Docker Desktop y el contenedor QA se iniciaron porque estaban detenidos; no se
recreó el entorno ni se modificó/inició explícitamente el contenedor habitual.

## Preparación del asistente TailAdmin PRO

La próxima entrega frontend podrá usar estos contratos para:

1. **Familia:** catálogo de comunidades y datos generales.
2. **Integrantes:** colección local, mínimo uno, errores indexados del servidor.
3. **Programas:** catálogo real, mínimo uno, sin IDs repetidos.
4. **Confirmar:** un único POST integral y navegación al expediente generado.

El expediente tendrá Información general, Integrantes y Programas. El frontend
deberá distinguir IDs de asociación/programa y manejar 400/404/500, fechas
ISO/null y respuestas de autenticación/autorización. No dividir el alta en varios
POST ni asumir que bloquear el doble clic proporciona idempotencia de red.
No se modificaron `FamilyForm`, `FamilyListPage` ni otros archivos web.
Entrega lista para revisión, sin commit, push ni merge automáticos.
