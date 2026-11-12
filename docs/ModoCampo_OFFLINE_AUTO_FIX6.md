# FIX6 — Trabajo de campo automático (PWA)

Este parche se aplica **después de FIX5**. No crea tablas ni migraciones en PostgreSQL.

## Flujo operativo

1. El técnico inicia sesión normalmente con internet. La aplicación consulta la API y precarga familias, visitas, compromisos, ciclos y catálogos autorizados en segundo plano. Mientras esa sesión siga abierta, los datos descargados están disponibles aunque falle la señal.
2. Si quiere **cerrar y volver a abrir la PWA sin internet**, debe configurar una vez una clave local en **Modo de campo**. Con la clave desbloqueada, la misma actualización automática guarda copias cifradas en IndexedDB. La autorización dura 48 horas; renovarla exige la misma clave y conexión autenticada.
3. Al registrar una visita, el sistema primero confirma su operación y fotografías en la cola local (`pending-operations`) y muestra un estado pendiente. **No bloquea el formulario esperando a Railway**.
4. Al regresar la API, la aplicación comprueba `/auth/me`, después intenta enviar las operaciones pendientes con su UUID original; la API y el endpoint de evidencias confirman cada parte. Hay reintentos progresivos únicamente para errores de red, 429 y 5xx. Los rechazos de reglas de negocio requieren corrección desde Historial.
5. En el formulario hay un borrador temporal automático (texto, cultivos, compromisos, fotografías). Si la clave local está desbloqueada, el borrador se cifra; si no, solo dura la sesión abierta. Al guardar la visita completa, se descarta el borrador de forma segura y permanece la operación local pendiente hasta el acuse del servidor.

La red se identifica con la respuesta real de `/api/health`, no únicamente con `navigator.onLine`. Los datos en memoria no se publican en otros navegadores ni sobreviven al cierre de la PWA.

## Prueba manual en Android

- Abrir la **PWA instalada**, conectarse a Railway y entrar con un usuario técnico. Dejar finalizar la descarga automática (red de prueba con 19 familias: comprobar que se incluyen todas).
- Abrir Registro de visitas y comprobar que la búsqueda de familias y los catálogos están disponibles. En Modo de campo se puede configurar la clave para disponer de copia persistente.
- Empezar una visita, añadir una evaluación, un compromiso y una fotografía. Pasar a modo avión y seguir editando. Pulsar **Guardar visita**: se confirma el guardado local y aparece como pendiente en Historial; no debe mostrar un bloqueo por caída de internet.
- Sin conexión, abrir Historial y una nueva visita: se consultan los datos que ya se descargaron. Reanudar un borrador si se dejó uno antes de guardarlo.
- Recuperar conexión y dejar la app abierta. En aproximadamente 15 segundos el coordinador intenta sincronizar; los fallos temporales hacen backoff (10 s a 15 min). Verificar en la API/Railway que el UUID se insertó **una sola vez**, con sus fotos, evaluaciones, producción y compromisos.
- Probar caída de conexión justo después de guardar y durante el envío de una fotografía. Repetir el envío: no debe crear visitas duplicadas.
- Forzar una validación de negocio inválida en un entorno de prueba: **no** debe reintentarse indefinidamente; queda para corrección.
- Con el dispositivo preparado, cerrar la PWA con internet, pasar a modo avión y reabrirla. Debe solicitar la clave de campo para acceder a la copia cifrada; sin una preparación previa no puede abrirse con datos persistentes.
- Cerrar sesión sin internet: no deben enviarse las operaciones hasta reautenticar. La cola pendiente se conserva.

## Límites y advertencias

- El cache temporal (sin clave) **no** protege contra cierre de proceso o reinicio de teléfono. Para ello es indispensable la clave de campo, la primera carga del service worker y una descarga cifrada completa.
- La cola heredada `pending-operations` almacena las capturas finales y fotografías en IndexedDB sin cifrarlas; **FIX6 no migra esta cola ni elimina capturas anteriores**. Antes de implantar en teléfonos compartidos, cifrar también esta cola y establecer una política de borrado después de acuses definitivos.
- IndexedDB puede ser borrado por el navegador, el sistema operativo o el usuario. No sustituye respaldos de PostgreSQL. Evitar dispositivos compartidos y utilizar bloqueo de pantalla.
- Si la API limita el listado a 500 ciclos y se alcanza ese máximo, la descarga no se marca como completa; hay que implementar paginación en el endpoint para cantidades mayores.
- No se pueden recibir permisos nuevos ni cambios de catálogos sin señal. Una revocación del servidor requiere conexión para detectarse; el acceso offline tiene vencimiento.
- Se recomienda completar pruebas E2E reales en Android y en Railway antes de integrar la rama a `main`.
