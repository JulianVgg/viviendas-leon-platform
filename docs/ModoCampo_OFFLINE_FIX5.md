# Modo de campo offline — FIX5

## Preparación (personal técnico)

1. Iniciar sesión en ViviendasLeón con conexión, desde el teléfono que se utilizará en campo.
2. En el menú de usuario elegir **Modo de campo** o abrir `/visitas/preparar-campo`.
3. Elegir una clave local **distinta de la contraseña de la cuenta**, de 8 a 64 caracteres.
4. Pulsar **Preparar para trabajar sin conexión** y esperar la confirmación. Se descargan todas las páginas de familias, los ciclos disponibles (máximo 499), cultivos, insumos, plagas, enfermedades, unidades/monedas, visitas y compromisos. La pantalla indicará los conteos.
5. Confirmar que la PWA está instalada y controlada por el Service Worker. Activar modo avión y comprobar que abre **Registrar visita** y que muestra las familias descargadas.
6. Capturar una visita real de prueba y comprobar en **Historial de visitas** que queda pendiente. Recuperar conexión, validar la sesión del servidor y comprobar sincronización con el mismo UUID, incluyendo fotografías.

## Seguridad y funcionamiento

- La autorización local dura 48 horas desde su preparación; no es una sesión PostgreSQL/API ni sustituye permisos del servidor.
- En cada arranque offline se solicita la clave; el perfil se cifra con AES-GCM y clave derivada mediante PBKDF2. Las copias locales por usuario de familias, visitas y catálogos también se cifran. Los registros de versiones previas sin cifrar se descartan al preparar.
- Las pantallas abiertas con autorización local se limitan a **Registrar visita**, **Historial** y **Modo de campo**. No se autorizan altas de familias, administración ni mutaciones de datos maestros offline.
- Una respuesta explícita 401/403 de la API bloquea la sesión; un fallo de transporte NO la confunde con una denegación. Al volver la API se comprueba la sesión antes de enviar operaciones pendientes.
- Al cerrar sesión offline se bloquea la aplicación local inmediatamente y se agenda la invalidación de la cookie del servidor para el próximo acceso con conexión.
- La cola de operaciones *existente* `pending-operations` conserva su formato para no perder capturas previas. **Advertencia de privacidad**: las capturas pendientes (incluidas fotografías) todavía pueden estar almacenadas sin cifrado en esta cola heredada. No habilitar el uso de datos sensibles en equipos compartidos o sin cifrado/bloqueo de pantalla; se recomienda cifrar esa cola en una próxima iteración con estrategia de recuperación de clave antes del despliegue institucional general.
- La sincronización se ejecuta cuando la aplicación vuelve a estar abierta **y** la sesión de servidor ha sido verificada. No se promete envío en segundo plano con la PWA cerrada.
- El borrado de datos del navegador, el modo incógnito, las políticas de limpieza de almacenamiento o la desinstalación de la PWA pueden borrar registros todavía no sincronizados. No cerrar el dispositivo sin revisar pendientes.

## Límites existentes

- La API actual de ciclos devuelve hasta 500. Una descarga con exactamente 500 ciclos es rechazada para no asegurar falsamente que el paquete esté completo.
- El formulario técnico puede operar con familias y ciclos ya descargados; no permite consultar datos nuevos de la API ni registrar visitas con fechas distintas de la fecha local que exige la validación existente.
- No hay migraciones de Prisma/PostgreSQL. La versión de IndexedDB se conserva y el almacenamiento seguro es retrocompatible con el esquema anterior, pero ya no muestra copias de visitas sin cifrar.

## Prueba de aceptación manual

- [ ] Preparación online confirma conteos completos y muestra fecha.
- [ ] Modo avión y recarga/PWA recién abierta muestran acceso con clave de campo.
- [ ] Clave incorrecta y autorización vencida rechazan acceso.
- [ ] Familias, ciclos y catálogos predescargados se pueden consultar sin API.
- [ ] Registro de visita y fotografía permanecen tras cerrar/reabrir la PWA.
- [ ] Al recuperar conexión no sincroniza hasta validar `GET /api/v1/auth/me`.
- [ ] Sincronización evita visitas duplicadas y conserva rechazos para corrección.
- [ ] Cambio de usuario no muestra las copias locales de otro técnico.
- [ ] Cierre de sesión sin internet revoca acceso local y no destruye registros pendientes.
