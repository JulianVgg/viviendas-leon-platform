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
no existe catálogo institucional. No se inventan opciones de sexo/parentesco:
son textos opcionales admitidos por el contrato actual.

## Validaciones por paso y accesibilidad

1. **Familia:** nombre recortado obligatorio, máximo 150; comunidad del catálogo;
   municipio de solo lectura; fecha existente opcional; observaciones máximo 2000.
   ACTIVA es informativo, asignado por backend.
2. **Integrantes:** mínimo uno, nombre obligatorio en todas las filas, nacimiento
   opcional válido; agregar y quitar conservando al menos una fila. El resto de
   campos son opcionales y no se introducen límites no definidos por el contrato.
3. **Programas:** mínimo uno, IDs del catálogo sin duplicados (opciones ya elegidas
   deshabilitadas y validación adicional); fechas reales; salida no anterior al
   ingreso. Catálogo vacío/error: aviso, reintento GET y bloqueo del avance.
4. **Confirmar:** resumen y navegación correctiva; vuelve a validar los tres pasos
   antes de enviar. Ninguna escritura al avanzar o retroceder.

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

## Evidencia ejecutada

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

### Reproducir sin instalar dependencias

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

En otra terminal, con Edge instalado en su ubicación Windows habitual:

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

## PostgreSQL QA y seguridad pendiente

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

Pendientes de otra entrega: autorización real por rol, pruebas E2E con sesión y
persistencia QA, idempotencia, definición institucional de estados de participación,
presentación integral de `/familias/:id`, edición de expediente y modales. Nada de
ello se anticipa aquí. Sin commit, push ni merge automáticos.
