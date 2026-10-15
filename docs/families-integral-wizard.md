# Familias — segunda entrega: asistente integral

Verificación: **2026-10-14**. Rama `feat/families-integral-wizard`, creada desde
`origin/main` (`4d637b3`) después de `git fetch origin`. El árbol inicial estaba
limpio; no se hizo stash, reset ni modificación de trabajo ajeno.

## Alcance y archivos

- `apps/web/src/features/families/components/FamilyWizard.tsx`: asistente visual
  Familia → Integrantes → Programas → Confirmar; filas controladas y resumen.
- `apps/web/src/features/families/types/familyIntegral.ts`: tipos de borrador,
  integrantes, participaciones, catálogo, payload y expediente integral JSON.
- `apps/web/src/features/families/services/familyWizard.ts`: validaciones,
  normalización explícita del payload, errores indexados y mensajes seguros.
- `apps/web/src/features/families/services/familyService.ts`: añade
  `fetchFamilyProgramOptions` y `createIntegralFamily`; mantiene métodos básicos.
- `apps/web/src/features/families/pages/FamilyCreatePage.tsx`: sustituye únicamente
  el formulario de `/familias/nueva` y conserva la consulta de comunidades.
- `apps/web/tests/familyWizard.test.mjs`: pruebas Node y navegador opcional sin
  nuevas dependencias.
- Este documento: decisiones, evidencia reproducible y pendientes.

No se modifican AUTH, rutas, AppLayout, Sidebar, expediente básico, listados,
PWA, servicios offline, API, esquema, migraciones ni dependencias.

## Presentación y componentes PRO reutilizados

Se conserva el marco institucional y se reutilizan `PageHeader`, `PageMeta`,
`Form`, `FormGrid`, `FormSection` con tarjetas PRO, `FormField`, sus estilos de
control/foco, `Button`, `Alert`, `LoadingState`, `Card` y `CardBody`.

El progreso usa cuatro indicadores (dos columnas en pantallas pequeñas y cuatro
desde `sm`), seguido de tarjetas de campos. El resumen tiene tarjetas separadas
para familia, integrantes y programas, con botones para corregir cada sección.
Se mantienen tokens brand/slate, bordes redondeados, espaciado y variantes dark.
Las acciones se ajustan en varias líneas; filas y resúmenes usan anchos mínimos
cero y ajuste de texto.

Se evaluó `FormRepeater`: solo admite `initialItems` y estado interno. No puede
restaurar de forma controlada filas al remontarse entre pasos. Por ello este
asistente usa filas específicas dentro de `FamilyWizard`, con un solo borrador
en el padre y claves estables locales. No se cambia el componente compartido.

## Contratos consumidos

Referencia: [API integral](families-integral-api.md) y tipos/validador del backend.

| Operación | Uso |
|---|---|
| `GET /api/v1/comunidades` | Comunidades disponibles y municipio derivado; el backend filtra comunidad y municipio activos |
| `GET /api/v1/familias/opciones/programas` | Única fuente de programas seleccionables; sin mocks en producción |
| `GET /api/v1/auth/me` | Sesión existente: ProtectedRoute al entrar y comprobación antes del envío |
| `POST /api/v1/familias/registro-integral` | Un único POST explícito para todo el expediente |

Los servicios conservan la configuración `VITE_API_URL` existente y las cookies
same-origin. AUTH sigue usando `/api/v1/auth/me` como actualmente; la verificación
real debe hacerse con el proxy/origen de sesión del proyecto, no con otro sistema
de autenticación ni con RoleContext. La comprobación previa no modifica el
AuthProvider: limpiarlo al expirar desmontaría el formulario y perdería el borrador.

Se exige HTTP **201** y un ID positivo generado por servidor; luego se navega a
`/familias/:id`, cuyo expediente básico permanece intacto. No se ejecuta POST
básico ni escrituras individuales de integrantes o asociaciones.

Fechas de entrada: `YYYY-MM-DD`, sin convertirlas a instantes en el payload.
Opcionales vacíos: `null`. El serializador enumera propiedades permitidas:
no envía claves locales, IDs de familia/persona/asociación ni `activo` o estado
inicial. El estado de participación se omite visualmente y se envía `null`, ya que
no existe catálogo institucional de participación. Por solicitud posterior del
usuario, el paso Integrantes exige fecha de nacimiento y sexo `Masculino`/`Femenino`
y parentesco `Padre`, `Madre`, `Hijo`, `Hija`, `Abuela`, `Abuelo`, `Cuñado`, `Cuñada`.
El parentesco también es obligatorio. Solo el teléfono y las observaciones del
integrante pueden omitirse y se envían como `null`. Los campos requeridos se
validan por cada fila antes de avanzar. Estas restricciones se validan en
frontend; no cambian el contrato ni restringen registros históricos
en el backend o en el expediente de solo lectura.

## Validaciones por paso y accesibilidad

1. **Familia:** nombre recortado obligatorio, máximo 150; comunidad del catálogo;
   municipio de solo lectura; fecha de ingreso existente obligatoria;
   observaciones opcionales, máximo 2000.
   ACTIVA es informativo, asignado por backend.
2. **Integrantes:** mínimo uno; nombre, nacimiento válido, sexo y parentesco
   obligatorios en todas las filas; agregar y quitar conservando al menos una
   fila. Solo teléfono y observaciones son opcionales. No se introducen límites
   de longitud no definidos por el contrato.
3. **Programas:** mínimo uno, IDs del catálogo sin duplicados (opciones ya elegidas
   deshabilitadas y validación adicional); fechas reales; salida no anterior al
   ingreso. Catálogo vacío/error: aviso, reintento GET y bloqueo del avance.
4. **Confirmar:** resumen y navegación correctiva; vuelve a validar los tres pasos
   antes de enviar. Ninguna escritura al avanzar o retroceder.

Ajuste posterior solicitado: todos los campos editables de Familia e Integrantes
son obligatorios salvo observaciones y, en integrantes, teléfono. Programas
conserva sus reglas anteriores. Se marcan y validan en controles y por cada fila.
La suite actualizada aprobó **21/21**, incluida Brave con HTTP simulado y
validación de ingreso/parentesco obligatorios y teléfono/observaciones opcionales. Se adaptaron
también las fixtures del runner QA; no se repitieron sus escrituras para este ajuste.
Diagnóstico local del catálogo: el proxy devolvió `404 / NOT_FOUND` por el gate
integral deshabilitado. El `.env` habitual no define las variables de habilitación
y apunta al puerto 5432; no se modificó ni se habilitó sobre esa base. El flujo
integral requiere un arranque QA aislado y verificado, no quitar el gate.

El borrador solo vive en memoria React. No se guarda información personal en
localStorage, IndexedDB ni colas offline. Recargar, cerrar o abandonar la página
descarta el borrador: no hay persistencia de formulario ni bloqueo de navegación.

Etiquetas asociadas, errores bajo los controles con `aria-invalid` y
`aria-describedby`, fieldsets/legends para filas, `aria-current="step"`, estado
ocupado y mensaje “Guardando expediente...”. El foco pasa al encabezado de paso,
al nuevo integrante/programa, a la fila vecina al quitar y al primer error.
Los índices del backend se traducen usando la instantánea enviada a claves
locales estables: `integrantes[1].nombreCompleto` y `programas[0].programaId` no
se confunden al eliminar filas. Un error previo devuelve al paso correspondiente.

## Envío y recuperación

- Ref síncrona más botones/fieldset deshabilitados impiden doble clic concurrente.
- Comprobación de sesión fallida antes del POST: no se envían datos del expediente.
- HTTP 400 conserva todos los datos y muestra detalles por campo/fila/arreglo.
- HTTP 401/403: mensajes de sesión/permisos, sin quitar controles de seguridad.
- HTTP 404 integral: funcionalidad no habilitada; sin fallback al POST básico.
- HTTP 500: mensaje seguro, sin mostrar texto interno de errores generales.
- Fallo de red/respuesta inválida después de iniciar el POST: resultado incierto,
  aviso de posible creación, enlace al listado y bloqueo de otro envío en esa
  instancia. No hay reintento automático.
- Fallo de red al comprobar sesión: indica que aún no se envió el expediente.

El bloqueo local no garantiza idempotencia de red ni evita dos altas desde
pestañas diferentes. La idempotencia persistente sigue pendiente en backend.

## Evidencia inicial (anterior a la verificación real)

| Comprobación | Resultado |
|---|---|
| `npm run build` raíz, antes y después | Aprobado: API, TypeScript web, Vite y generación PWA |
| `npm run lint` raíz | Aprobado sin advertencias nuevas; cuatro preexistentes en AUTH, offline y visitas |
| `git diff --check` | Aprobado; avisos informativos de conversión LF/CRLF |
| Pruebas nuevas de lógica | 16 aprobadas; payload también validado por el validador real del backend compilado |
| Edge headless, CDP nativo, HTTP interceptado | 1 prueba de navegador aprobada; total final 17/17, ninguna omitida en esa ejecución |
| Suite backend preexistente al iniciar | Bloqueada antes de los casos: `DATABASE_URL no está configurada` en middleware de sesión incorporado en main |
| PostgreSQL QA real | No ejecutado; no se realizaron escrituras |

La prueba de navegador utiliza **exclusivamente respuestas HTTP simuladas y datos
sintéticos**, incluida la sesión. Todas las solicitudes `/api/*` quedan
interceptadas por CDP. No acredita autenticación real, autorización ni persistencia.

Casos comprobados en navegador:

- Cuatro pasos; foco del primer error; integrantes múltiples; agregado y borrado
  con foco estable; conservación de valores al retroceder y volver a avanzar.
- Dos programas; opciones duplicadas deshabilitadas; fechas invertidas corregibles.
- Cero POST antes de confirmar; doble clic produce un solo POST con ambos arreglos.
- 400 indexado devuelve a Integrantes y enfoca la segunda persona correcta.
- Respuestas 401, 403, 404 y 500, sin mostrar el mensaje interno simulado.
- Sesión expirada en la comprobación previa impide cualquier POST y conserva resumen.
- 201 navega al ID devuelto y permite cargar el expediente básico con HTTP simulado.
- Catálogo vacío bloquea avance; reintento fallido y posterior recuperación.
- Fallo de red del POST presenta incertidumbre y deshabilita nueva confirmación.
- Los **cuatro pasos × cinco anchos (320, 375, 768, 1024, 1440 px) × dos temas**
  no presentan desbordamiento horizontal según medición del documento, una vez
  finalizada la transición responsive del AppLayout/Sidebar existente.
- Tab mueve el foco a un control nativo; controles semánticos y enfoque de errores.

No se realizó auditoría completa con lector de pantalla ni revisión visual manual
o comparación de capturas. La prueba Tab no sustituye una pasada manual completa
del asistente exclusivamente con teclado. Tampoco se afirma cobertura E2E real
de los demás módulos; permanecen sin modificar y se compilaron con el proyecto.

### Reproducir las pruebas con HTTP simulado

Con Node 25 (entorno verificado; soporte nativo de tipos TS):

```powershell
npm run build
node --test apps/web/tests/familyWizard.test.mjs
npm run lint
git diff --check
```

El comando Node anterior ejecuta las 16 pruebas de lógica y omite expresamente
la prueba opcional de navegador. Para ejecutar también el navegador, en una
terminal iniciar Vite:

```powershell
npm run dev -w @viviendas-leon/web -- --host 127.0.0.1 --port 5174 --strictPort
```

En otra terminal, con Brave instalado en su ubicación Windows habitual
(el runner se actualizó de Edge a Brave durante la verificación posterior):

```powershell
$env:RUN_FAMILY_WIZARD_BROWSER = 'true'
$env:FAMILY_WIZARD_URL = 'http://127.0.0.1:5174'
node --test apps/web/tests/familyWizard.test.mjs
```

La prueba crea un perfil temporal aislado en `%LOCALAPPDATA%\Temp\opencode`,
cierra su propio navegador y no altera perfiles personales. No instala Playwright
ni otras librerías. Las primeras ejecuciones detectaron un arranque Vite con raíz
incorrecta y cancelaciones CDP de solicitudes GET por StrictMode; se corrigió el
comando y el tratamiento de esas cancelaciones. Una repetición también detectó
que la medición responsive debía esperar la transición del layout existente;
se incorporó esa espera al test, sin alterar el layout. El resultado anterior corresponde
a la ejecución final aprobada, no a esos intentos fallidos.

## Estado inicial de PostgreSQL QA (histórico)

Inspección **solo de metadatos Docker**, sin lectura de secretos:

- Contenedor `viviendas-leon-qa-postgres`: detenido (`Exited (255)`).
- Imagen `postgres:17`, volumen `viviendas-leon-qa-data` montado en
  `/var/lib/postgresql/data`.
- Publicación configurada visible: `127.0.0.1:5433` → `5432/tcp`.
- Al estar detenido no se comprobó identidad SQL efectiva, base ni usuario.
  No se verificó exclusividad global del volumen para una escritura.

**No se inició API con la base habitual, no se arrancó el contenedor, no se
ejecutaron migraciones/seed ni se escribieron o borraron registros N01/QA.**
La persistencia real y login real quedan pendientes de una sesión QA válida,
configuración segura de `SESSION_SECRET` y conexión QA verificada. La suite
preexistente requiere adaptar su configuración de pruebas a la incorporación de
sesiones de main; no se modificó AUTH para conseguir que pasara.

Antes de cualquier futura escritura: verificar contenedor, volumen exclusivo,
host `127.0.0.1`, puerto `5433`, base `viviendas_leon_qa`, usuario `viviendas_qa` y
conexión efectiva SQL/Prisma, conforme a la documentación API. No basta la metadata
Docker. No habilitar QA sobre una base diferente ni eliminar registros anteriores.

Los endpoints integrales siguen deshabilitados por defecto; requieren
`NODE_ENV=development|qa` y `ENABLE_FAMILY_INTEGRAL_API=true`. Esta barrera **no
implementa autorización por rol**. El preflight de sesión del frontend tampoco
protege el endpoint frente a clientes directos y no reemplaza controles backend.
No se usarán datos reales ni despliegue público. Si la sesión real o permisos
impiden probar, debe resolverlo el equipo AUTH en el entorno autorizado, sin
usuarios simulados para integración ni eliminación de controles.

En ese momento quedaban pendientes las pruebas E2E con sesión y persistencia QA;
su resultado actualizado aparece a continuación. Siguen pendientes de otra entrega:
autorización real por rol, idempotencia, definición institucional de estados de participación,
presentación integral de `/familias/:id`, edición de expediente y modales. Nada de
ello se anticipa aquí. Sin commit, push ni merge automáticos.

## Verificación real posterior — Brave y PostgreSQL QA

**Estado vigente:** verificación realizada el 2026-10-14, hora local Guatemala;
los prefijos de fixtures usan fecha UTC `20261015`. Rama
`feat/families-integral-wizard`, HEAD inicial `26aa86b`; árbol inicial limpio.
Se ejecutó `git fetch origin`: `origin/main` apunta a `9fea22f`. La comparación
`git diff origin/main -- apps/api/src apps/web/src/features/auth` está vacía:
las pruebas ejecutan el backend y AUTH actuales de main, sin parches de aplicación.
El asistente no se reimplementó ni se modificó su lógica o presentación.

### Archivos de esta verificación

- `apps/api/tests/families-integral.test.mjs`: configuración aislada antes del
  import dinámico de `app`; secreto aleatorio y barrera de conexiones PostgreSQL.
- `apps/api/tests/families-integral.qa.test.mjs`: configura un secreto de sesión
  aleatorio en su propio proceso, antes de importar la aplicación.
- `apps/api/tests/families-wizard.qa.test.mjs`: nuevo runner reproducible de
  integración real, Brave/CDP, SQL independiente, aislamiento y conservación.
- `apps/web/tests/familyWizard.test.mjs`: usa Brave instalado (o `BRAVE_PATH`)
  para repetir las pruebas con HTTP simulado. Sin instalaciones nuevas.
- Este documento. Sin cambios en AUTH, asistente, API de producción, expediente,
  navegación, offline, dependencias, configuración habitual ni migraciones.

### Desbloqueo de sesiones y pruebas unitarias

El import estático de `app` construía `createSessionMiddleware()` antes de que
las pruebas definieran `DATABASE_URL` y `SESSION_SECRET`. El middleware exige URL
y secreto de al menos 32 caracteres, correctamente también al arrancar pruebas.

La suite unitaria ahora configura, **solo en su proceso**:

- `NODE_ENV=test`.
- URL centinela sin credenciales reales a `127.0.0.1:1/unit_test`, que no es una
  base operativa ni pretende acreditar integración.
- `SESSION_SECRET`: 48 bytes aleatorios convertidos a hex, generado en memoria.
- `pg.Pool.prototype.connect` y `pg.Client.prototype.connect`: barreras que
  fallan ante cualquier intento de conexión; un hook final exige **cero intentos**
  y restaura los métodos. No se reemplaza el middleware de sesiones.
- Solo después se importa la aplicación real de main.

Resultado: **40/40 aprobadas**, cero accesos PostgreSQL, sin cargar `.env` ni
credenciales habituales. No se añadieron defaults de producción ni se eliminaron
controles para obtener ese resultado.

### Aislamiento real confirmado antes de escribir

1. Docker: contenedor `viviendas-leon-qa-postgres`, imagen `postgres:17`, ID
   `c9878fa14e02cabacc4503a076f53cc3aeab03a401c0a49b94696d875f84f815`.
2. Volumen `viviendas-leon-qa-data` exclusivo: se inspeccionaron **todos** los
   contenedores y ninguno más monta su origen. Volumen y contenedor distintos del
   entorno habitual `viviendas-leon-postgres` en puerto host 5432.
3. Se inició únicamente el contenedor QA, que estaba detenido. Puerto efectivo
   `127.0.0.1:5433` → 5432 interno.
4. Conexión SQL independiente inicialmente `default_transaction_read_only=on`:
   `current_database()=viviendas_leon_qa`, `current_user=viviendas_qa`, puerto
   interno 5432, PostgreSQL **17.11**.
5. Se asignó `DATABASE_URL` de destino fijo QA al proceso de pruebas antes del
   import de la API. Identidad efectiva de **Prisma** comparada con la conexión SQL.
   Solo después se permitió escritura para las fixtures autorizadas.
6. API y Vite ligados a loopback, puertos locales administrados por el runner,
   proxy `/api` a esa API, `VITE_API_URL=/api`. La URL no puede heredarse de una
   base habitual. El archivo privado de contraseña se leyó sin imprimir su contenido.
7. Huella de metadatos del contenedor habitual y hash de `apps/api/.env` antes y
   después: iguales. No se abrió ninguna conexión SQL a la base habitual.
8. Se tomaron fingerprints de **todas las filas públicas preexistentes** en QA;
   al terminar, todas permanecen idénticas. Incluye N01, QA anteriores, usuarios,
   roles y fixtures de ejecuciones previas. No se imprimen datos de esas filas.

Sin seed general, migrate reset, db push, migraciones, borrados ni reseteos.
Los procesos API/Vite/Brave propios se cierran al finalizar cada runner. El
contenedor QA se deja iniciado; el contenedor habitual no se modifica.

### Sesión real y cuenta sintética

La consulta inicial de solo lectura encontró **cero** cuentas activas
`qa%@example.invalid`. Cada ejecución crea una cuenta sintética única con correo
`example.invalid`, contraseña criptográficamente aleatoria solo en memoria y hash
**Argon2** compatible con `validateCredentials`. No se imprimen contraseña, hash,
cookie, ID de sesión ni secreto; tampoco se crean archivos con credenciales.
Las cuentas de ejecuciones anteriores no se resetean ni se reutilizan sin conocer
sus credenciales. No se asignan roles o permisos institucionales inventados.

Se usa el formulario de login real en Brave, `POST /api/v1/auth/login`, posterior
`GET /api/v1/auth/me` y `ProtectedRoute`. Se verifican `ultimo_acceso`, cookie
`viviendas_leon.sid` HttpOnly/SameSite=Lax y fila de sesión real PostgreSQL.
La tabla `session`, ausente inicialmente, fue creada por el middleware existente
`connect-pg-simple` al guardar la primera sesión, mediante su configuración
`createTableIfMissing`; no se ejecutó ninguna migración ni se alteró AUTH.

La sesión QA utiliza secreto aleatorio de 48 bytes por proceso, `NODE_ENV=qa` y
`ENABLE_FAMILY_INTEGRAL_API=true`. Cookie sin Secure solo para HTTP loopback QA,
tal como define el middleware actual. No se cambian opciones de producción.
El logout final se ejecuta desde el menú real de usuario: sesión eliminada,
`auth/me` responde 401 y la ruta protegida redirige al login.

**Sesión autenticada no equivale a autorización definitiva por rol.** El gate
integral sigue siendo solo desarrollo/QA. El 401 probado procede de AUTH/preflight;
no se afirma que el POST integral ya implemente autorización backend completa.

### Evidencia funcional real

Brave headless con perfil temporal aislado y CDP **sin `Fetch.enable` ni respuestas
interceptadas**. Login, comunidades, programas, familia, detalle y consultas se
ejecutan contra Express/Prisma/PostgreSQL reales.

- Login y cookie de sesión reales; comunidades activas y municipio derivado;
  programas reales seleccionables (se reutilizaron programas 1 y 2).
- Cuatro pasos; campos conservados al retroceder; validación de integrante y
  programa obligatorios; dos integrantes y dos programas; opción duplicada
  deshabilitada; resumen de nombres, fechas, programas y observaciones.
- Doble clic en confirmar: **un POST integral**, **HTTP 201**, una sola familia
  con ese nombre, ID generado por PostgreSQL y navegación al expediente básico.
- Recarga del navegador, consulta básica y expediente integral posteriores al commit.
- **400 real:** desactivar únicamente la comunidad sintética propia después de
  completar el borrador. El servidor devuelve error de campo, el asistente vuelve
  a Familia/enfoca comunidad y conserva datos. La fixture se restaura en `finally`.
- **404 real:** deshabilitar temporalmente el flag en el proceso QA; no producción.
- **500 real inducido:** inyección de dependencia solo en el runner sobre
  `$transaction`; se realizan las escrituras y se provoca una excepción dentro
  de la transacción. HTTP real 500, mensaje seguro y rollback comprobado en SQL.
  No es una avería espontánea ni una respuesta HTTP simulada.
- Recuperación tras resolver 400/404/500: el mismo borrador obtiene 201 una sola
  vez, sin perder integrantes o asociaciones.
- **401 real:** logout real mientras el borrador está abierto; preflight rechaza
  la confirmación, no se ejecuta POST y el resumen permanece en memoria.
- **Corte real de transporte inducido:** se destruye el socket del POST en el
  servidor de desarrollo antes de reenviarlo a Express, sin sustituir una respuesta
  HTTP. La UI informa resultado incierto, bloquea otro envío y no reintenta.
  Se verifica cero filas y un único intento. **No acredita pérdida de una respuesta
  201 después del commit**: ese escenario y la idempotencia de red siguen pendientes.

Evidencia SQL independiente final (sin datos personales):

| Familia | Estado | Ingreso | Integrantes (IDs) | Programas | Familias con el mismo nombre |
|---|---|---|---|---|---|
| 58 | ACTIVA | 2026-10-14 | 31, 32 | 1, 2 | 1 |
| 60, recuperación | ACTIVA | null | 34 | 1 | 1 |

Comunidad final 18, municipio 14, cuenta sintética 5. La fecha de nacimiento
`2000-01-15`, teléfono sintético `00000000`, observaciones y estado null de las
participaciones se compararon con SQL dentro del test. Sesiones restantes de la
cuenta final después del logout: **0**.

### Regresiones

- Listado real, búsqueda por prefijo, filtro ACTIVA/RETIRADA, limpiar filtros,
  cambio real a página 2, paginación HTTP, detalle básico y recarga: aprobados.
- Sidebar visible, colapsar/expandir y navegar mediante su enlace Familias:
  aprobados. Login y logout desde sus controles reales: aprobados.
- Smoke de rutas `/visitas/agenda`, `/visitas/nueva`, `/gestion-agricola/huertos`,
  `/actividades`, `/offline-queue-test`: aprobados, sin afirmar cobertura funcional
  completa de esos módulos, varios aún son vistas iniciales.
- IndexedDB real: consulta con conexión y posterior recuperación de caché con red
  offline. Cola existente: guardar una nota sintética sin red, conservar estado
  pendiente y pasar a fallida/reintentable mediante un procesador de fallo
  **simulado**. No se simula una confirmación del servidor para acreditarla.
- **No ejecutado:** sincronización real offline/deduplicación UUID en SQL:
  QA no contiene `offline_demo_note`. La prueba se omite explícitamente; no se
  aplicaron migraciones de otro módulo para forzarla. El 404 de ese endpoint al
  recuperar conexión refleja su gate deshabilitado, no un fallo de Familias.
- PWA: generación aprobada en build; instalación/service worker en dispositivo y
  auditoría completa de todas las rutas no ejecutadas en esta tarea.

### Resultados vigentes, fallos e intentos anteriores

| Suite / comprobación | Aprobadas | Fallidas finales | Omitidas |
|---|---:|---:|---:|
| Backend unitario/HTTP sin PostgreSQL | 40 | 0 | 0 |
| API integral con PostgreSQL QA real | 26 | 0 | 0 |
| Frontend lógica + Brave, HTTP simulado | 17 | 0 | 0 |
| Asistente Brave con API/SQL reales y regresiones | 16 | 0 | 1 |
| **Total de ejecuciones finales** | **99** | **0** | **1** |

Los conteos son los de `node:test` e incluyen tests contenedores cuando existen;
no suman las repeticiones históricas. El caso omitido es exclusivamente la
sincronización offline real por tabla ausente. La suite API previa se ejecuta
sin sesión por contrato actual; la sesión real del navegador se acredita en el
runner nuevo, no en las 26 pruebas API.

`npm run build`, `npm run lint`, lint adicional de `apps/api/tests` y
`git diff --check`: aprobados. Git puede avisar de conversión LF/CRLF; sin errores
de whitespace. Se mantuvieron las cuatro advertencias preexistentes descritas abajo.

Intentos anteriores de esta tarea, sin ocultarlos:

1. Primer runner real: 1 fallo de harness antes del navegador. Prisma generado
   publica `globalThis.__dirname`; al compartir proceso con Vite, el plugin PWA
   buscaba su `package.json` en el directorio de Prisma. El runner elimina ese
   global antes de cargar Vite; no se modificó Prisma generado ni código productivo.
2. Un runner inicial de alcance menor aprobó 14/14. Después se amplió la regresión.
3. Primera ejecución ampliada: dos casos offline fallaron (caché y cola), más el
   test contenedor; 13 aprobadas, 3 fallidas y 1 omitida. Se añadieron esperas de
   disponibilidad de los controles y diagnóstico sanitizado al harness. Las dos
   ejecuciones finales ampliadas aprobaron esos casos sin cambiar lógica offline.
   No se atribuye un defecto productivo a esos fallos de sincronización del test.

Fixtures conservadas de **todos** los intentos (prefijos UTC `QA_WIZARD_20261015_…`):

| Sufijo UUID | Usuario | Municipio | Comunidad | Familias |
|---|---:|---:|---:|---|
| `2eb34f85-dac4-4090-a18a-007da80ec5a2` | 1 | 8 | 11 | ninguna; fallo inicial del harness |
| `3ea52d8f-10bf-4768-9589-5cfc15f8dbb5` | 2 | 9 | 12 | 44 |
| `865b26a9-f289-4416-8508-ec27f3083008` | 3 | 12 | 16 | 52, 54 |
| `1b8fa556-089d-4588-83d1-01e581848fae` | 4 | 13 | 17 | 55, 57 |
| `c450dfdd-9a43-4091-b8ee-78612f09c047` | 5 | 14 | 18 | 58, 60 |

La suite API real conservó prefijo `QA_INTEGRAL_20261015_0a4c2687-561e-4688-9732-ecd96ea31ea3`:
municipios 10/11, comunidades 13/14/15, familias 46/47/50/51. No se crearon
programas adicionales. Los saltos de secuencia son esperables por rollbacks.
Las credenciales efímeras no se conservan; no se resetean estas cuentas para repetir.

### Investigación de las cuatro advertencias de lint

| Ubicación | Regla y causa concreta | Decisión |
|---|---|---|
| `apps/web/src/features/auth/AuthProvider.tsx:98` | `react/only-export-components`: el archivo exporta `AuthProvider` y el hook `useAuth`; Fast Refresh recomienda separar exports no componentes | No afecta el build ni demuestra fallo de sesión; no reorganizar AUTH ajeno |
| `apps/web/src/features/offline/pages/OfflineSyncTestPage.tsx:50` | `react/set-state-in-effect`: el efecto llama a `refresh`, que consulta IndexedDB y llama a `setRecords`; el análisis transitivo señala actualización iniciada desde efecto, aunque hay un `await` de una fuente externa | Es sincronización externa existente; no hay prueba de regresión del asistente; no tocar offline |
| `apps/web/src/features/visits/pages/VisitRegisterPage.tsx:59` | `react/set-state-in-effect`: `setFamiliesLoading(true)` y limpieza de error se ejecutan sincrónicamente al iniciar el efecto de carga/reintento, produciendo otro render | Patrón previo de carga; fuera del alcance de Familias |
| `apps/web/src/features/visits/pages/VisitAgendaPage.tsx:20` | `react/purity`: `localIso(new Date())` se calcula durante cada render; el reloj es una fuente impura que cambia entre renders | Requiere acordar actualización de “hoy” con visitas; no cambiar comportamiento sin esa definición |

No se silenciaron reglas ni se añadieron excepciones para presentar un lint limpio.

### Reproducir la verificación real

Requiere Docker, Brave ya instalado y el contenedor QA iniciado. No instalar nada
ni cargar `.env` habitual. Terminal de pruebas, secretos mediante archivo privado:

```powershell
npm run build
npm run test -w @viviendas-leon/api

$env:QA_PASSWORD_FILE = 'C:\ruta-protegida\postgres-password.txt'
$env:RUN_FAMILY_INTEGRAL_QA = 'true'
npm run test:qa -w @viviendas-leon/api

$env:RUN_FAMILY_WIZARD_REAL_QA = 'true'
node --test apps/api/tests/families-wizard.qa.test.mjs

npm run lint
npm exec --no -- oxlint apps/api/tests
git diff --check
```

El runner real configura la URL QA y los secretos efímeros **antes** de importar
`app`, inicia y cierra su API/Vite/Brave propios; no requiere un servidor manual.
Usa Brave en `%LOCALAPPDATA%\BraveSoftware\Brave-Browser\Application\brave.exe`
o `BRAVE_PATH`. Cada repetición agrega fixtures con otro prefijo y conserva datos
anteriores. Si no puede confirmar aislamiento, falla antes de escribir.

Las 17 pruebas con HTTP simulado se reproducen con los comandos de la sección
anterior y Vite en otra terminal; no deben confundirse con el runner SQL real.

### Recomendación

**GO funcional para continuar revisión del asistente en QA aislada, con datos
sintéticos:** sesión real, flujo integral, persistencia, recuperación y regresiones
indicadas comprobadas. **NO-GO para producción o datos reales:** autorización
backend por rol, protección de endpoints integrales e idempotencia siguen pendientes.
No se concede un GO global a sincronización offline real: falta su tabla en QA y
esa regresión permanece omitida. Auditoría manual completa de accesibilidad,
lector de pantalla y pérdida de respuesta posterior al commit tampoco se acreditan.

Sin commit, push ni merge automáticos. Cambios limitados a pruebas y documentación,
listos para revisión; el expediente visual permanece intacto.
