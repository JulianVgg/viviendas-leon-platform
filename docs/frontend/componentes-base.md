# Componentes base

La interfaz reutiliza Tailwind CSS y los componentes de `apps/web/src/components/ui`. No se utiliza una librería UI externa. Los componentes deben resolver necesidades comunes de los módulos sin crear una capa de diseño independiente.

## Criterios comunes

- Usar los componentes base antes de crear estilos locales.
- Mantener `Inter`, la escala de espaciado de Tailwind y los radios existentes.
- Todos los controles interactivos deben mostrar foco visible y tener nombre accesible.
- Las variantes de estado deben combinar color con texto o información semántica.
- Los componentes deben funcionar en tema claro, oscuro y pantallas pequeñas.

## Button

Botón para acciones explícitas del usuario.

Variantes: `primary`, `secondary`, `danger`, `ghost`. Tamaños: `sm`, `md`, `lg`. Acepta las propiedades nativas de `button`, incluyendo `disabled`.

```tsx
<Button variant="primary" onClick={save}>Guardar</Button>
<Button variant="danger" disabled>Eliminar</Button>
```

## Card

Contenedor para agrupar información relacionada. `CardHeader` resuelve título, descripción y acciones; `CardBody` mantiene el padding común.

```tsx
<Card>
  <CardHeader title="Listado" description="Registros recientes" />
  <CardBody>Contenido del módulo</CardBody>
</Card>
```

## Badge

Etiqueta breve para estados o categorías.

Variantes: `neutral`, `success`, `warning`, `error`.

```tsx
<Badge variant="success">Activo</Badge>
```

## FormField

Agrupa label, control, ayuda y error de un formulario. El control hijo debe recibir el mismo `id` del campo y asociar el mensaje de error cuando sea necesario.

```tsx
<FormField label="Comunidad" id="community" required hint="Selecciona una comunidad.">
  <select id="community" className={formControlClassName} />
</FormField>
```

## DataTable

Tabla responsive para listados de módulos. Recibe `columns`, `rows` y un `caption` opcional para accesibilidad. `DataTableContainer` permanece disponible como fachada compatible.

```tsx
<DataTable columns={['Familia', 'Estado']} rows={rows} caption="Familias registradas" />
```

## Dialog

Diálogo modal para confirmaciones o formularios breves. Requiere `open`, `onClose` y un título. El fondo y el botón de cierre permiten salir del diálogo.

```tsx
<Dialog open={isOpen} title="Confirmar registro" onClose={() => setOpen(false)}>
  ¿Deseas continuar?
</Dialog>
```

## Alert

Mensaje contextual persistente para comunicar información o resultados.

Variantes: `info`, `success`, `warning`, `error`.

```tsx
<Alert variant="error" title="No se pudo guardar">Revisa los campos requeridos.</Alert>
```

## LoadingState

Estado de carga para contenido que todavía no está disponible.

```tsx
<LoadingState label="Cargando familias..." />
```

## SyncStatus

Representa conectividad y sincronización para soportar el funcionamiento sin conexión.

Estados: `synced`, `syncing`, `pending`, `offline`, `error`. `pendingCount` muestra cuántos registros locales esperan sincronización.

```tsx
<SyncStatus state="pending" pendingCount={3} />
```

## Componentes existentes conservados

- `PageHeader`: título, descripción, breadcrumb y acciones de página.
- `PageBreadCrumb`: contexto de navegación.
- `EmptyState`: ausencia de registros, con acción opcional.
- `NotificationDropdown`: avisos del encabezado.
- `ComponentCard`: fachada compatible que usa `Card`.
- `DataTableContainer`: fachada compatible que usa `DataTable`.

## Adaptación TailAdmin PRO — Etapa 2

Se adaptaron los estilos de los componentes existentes tomando como referencia Button, Badge, Alert, ComponentCard, Modal y BasicTableOne de TailAdmin React PRO 2.4. No se importaron sus contratos, datos de ejemplo ni estilos globales. Se conservan Inter, los breakpoints actuales y los tokens `brand` y `shadow-theme-*` de la Etapa 1, sin dependencias adicionales.

- **Button:** conserva `forwardRef`, atributos y eventos nativos, las cuatro variantes y los tres tamaños. Usa foco visible con tokens institucionales, sombras discretas y estados hover/active limitados a botones habilitados. No cambia el `type` recibido ni añade uno predeterminado.
- **Badge:** conserva variantes, contenido ReactNode y atributos HTML, con borde sutil y colores claros/oscuros. No añade un rol automático; los estados anunciados siguen siendo responsabilidad de `SyncStatus` o del consumidor.
- **Alert:** conserva `title`, `children`, variantes y atributos HTML. Mantiene `alert` para errores y `status` para el resto, salvo un `role` explícito del consumidor. Añade un icono decorativo por variante y mantiene el contenido dinámico, incluidos botones y el valor `0`.
- **Card:** conserva Card, CardHeader y CardBody. Ajusta tipografía, padding responsive y distribución de acciones. `ComponentCard` sigue siendo una fachada; además de sus props anteriores, acepta opcionalmente `actions` y `className`, sin exigir cambios en sus usos.
- **Dialog:** conserva `open`, `onClose`, `title`, `description`, `children` y `actions`. Se renderiza mediante un portal a `document.body` y un `<dialog>` nativo abierto con `showModal()`: el navegador administra la capa modal, el foco y el aislamiento del fondo. Los IDs de título y descripción son únicos. El foco inicial va a Cerrar; Escape solicita `onClose` sin cerrar por su cuenta el estado controlado. El backdrop también solicita cierre. Al cerrar o desmontar, restaura el foco si el elemento original sigue conectado y el estilo anterior de scroll, incluida su prioridad CSS. Los diálogos comparten el bloqueo de scroll. El padre debe actualizar `open` al recibir `onClose`.
- **DataTable:** conserva `columns: string[]`, `rows: ReactNode[][]`, `caption` y `className`. Añade marco, cabecera diferenciada y estados hover/focus de fila. Mantiene `scope="col"`, caption accesible y scroll horizontal, ahora enfocable por teclado como región etiquetada. `DataTableContainer` delega también las props opcionales `caption` y `className`. No añade filtros, ordenamiento ni paginación.

### Verificaciones de esta etapa

- Build y lint iniciales y finales desde la raíz, más `git diff --check`.
- Verificaciones puntuales en memoria de renderizado HTML y contratos: variantes/tamaños y forwarding de Button, roles y contenido de Badge/Alert, composición de Card, campos y mensajes, estados de formularios, tablas dinámicas y Dialog cerrado.
- Ciclo de Dialog verificado con un DOM simulado: IDs, foco inicial/restaurado, cierre solicitado, bloqueo de scroll compartido y restauración del estilo previo. Esto **no sustituye** una prueba del comportamiento nativo de `showModal()`.
- No se ejecutaron pruebas visuales ni de interacción en un navegador real. Queda pendiente comprobar teclado, lector de pantalla, contraste medido, tema claro/oscuro y pantallas pequeñas. Dialog no tiene consumidores de pantalla actualmente; su apertura debe probarse antes de integrarlo en un flujo funcional.

No se modificaron páginas, datos, servicios, roles, rutas ni persistencia offline.

## Familias y beneficiarios — Etapa 3

Se modernizaron únicamente la presentación de FamilyListPage, FamilyCreatePage, FamilyDetailPage y FamilyForm. Se reutilizan PageHeader, ComponentCard, DataTableContainer, Card, Badge, Alert, FormField y las primitivas de formularios adaptadas en la Etapa 2. Las referencias visuales PRO fueron BasicTableOne, DefaultInputs y UserMetaCard; no se copiaron datos, acciones de edición ni módulos de demostración.

- **Listado:** acción de registro con foco visible, etiquetas de filtros visibles, tabla con caption, nombre e ID del expediente en el enlace, texto largo de comunidad/programas ajustable y paginación en dos columnas en móvil. El total y los números de página proceden de la respuesta del servidor. La región de resultados comunica `aria-busy` durante la carga.
- **Registro:** secciones de identificación/ubicación e información complementaria; panel de orientación sin campos nuevos. Mantiene consulta de comunidades, cancelación, guardado y redirección existentes.
- **Expediente:** datos básicos en una Card y observaciones en otra; estado con Badge y distribución responsive. No contiene pestañas ni consultas de módulos pendientes.
- **Estados:** se conservan cargas, reintentos, errores, vacíos y advertencias de copia local/solo lectura. No se habilita caché en producción ni se cambia el comportamiento de persistencia.

### Verificación realizada

Build y lint iniciales y finales, revisión de contratos y comparación sintáctica de efectos, estados, handlers y atributos funcionales con la rama de partida. Once grupos de verificaciones en memoria cubrieron renderizado de las pantallas, errores/vacíos/caché simulados, payload, validación y bloqueo de doble envío. Las fixtures sintéticas existieron solo durante la ejecución de pruebas: no se añadieron a la aplicación ni se enviaron a una API.

No se dispuso de Playwright, Puppeteer ni un DOM de pruebas instalado. No se realizaron capturas, interacción en navegador, registro real ni lectura real de IndexedDB. La matriz siguiente es un procedimiento **pendiente**, no un resultado aprobado.

### Matriz manual reproducible

Preparación:

1. Utilizar un entorno de desarrollo con API y base de datos de pruebas aisladas. Confirmar que no contiene beneficiarios reales antes de consultar, registrar o capturar información. No ejecutar pruebas de escritura contra producción.
2. Ejecutar `npm run dev:web` desde la raíz y abrir la URL indicada por Vite. Para las pruebas de API, disponer del backend de pruebas ya configurado; esta etapa no instala ni configura una base de datos.
3. Usar el rol simulado `fieldWorker` o `coordination`. Abrir DevTools, pestañas Network y Console. Los permisos de interfaz no representan autorización del backend.
4. Repetir las pruebas visuales y de teclado a **320, 375, 768, 1024 y 1440px**, en tema claro y oscuro. Registrar navegador, viewport, tema, resultado y evidencia sin datos personales.

| Caso | Procedimiento | Resultado esperado | Estado |
|---|---|---|---|
| Sidebar móvil | Abrir menú, usar Tab/Shift+Tab, Escape, backdrop y un enlace | Foco limitado a navegación abierta; cierre y restauración del scroll; enlace cierra menú | Pendiente |
| Sidebar escritorio | A 1440px, colapsar y acceder por hover y teclado; abrir/cerrar submenú activo | Navegación legible, foco visible y submenú colapsable; sin ocultar destinos | Pendiente |
| Tema y overlays | Cambiar tema; abrir/cerrar avisos y selector mock con teclado y clic exterior | Contraste legible, controles funcionales y foco restaurado con Escape | Pendiente |
| `/familias` | Abrir listado; con datos de prueba, seguir un enlace | Carga visible, columnas accesibles, datos de API y expediente correcto | Pendiente |
| Búsqueda | Escribir un término de pruebas y enviar; después Limpiar | Network muestra `search`, `page=1`, `limit=20`; Limpiar restablece filtros | Pendiente |
| Estado | Seleccionar cada estado disponible | Network muestra `estado` y reinicia página; sin filtro u ordenamiento local | Pendiente |
| Paginación | Con más de 20 registros de pruebas, usar Siguiente/Anterior | Nueva consulta con `page`; totales del servidor; límites deshabilitados | Pendiente |
| Tabla móvil | Enfocar región de tabla y desplazarla horizontalmente | Scroll dentro de tabla, no de toda la página; enlaces con foco visible | Pendiente |
| Vacío | Buscar un término sin coincidencias o usar una base de pruebas vacía | Mensaje contextual y acción Limpiar cuando hay filtros | Pendiente |
| Error de API | Bloquear temporalmente la petición de familias/comunidades/detalle con DevTools; desbloquear y Reintentar | Error visible y recuperación sin perder controles | Pendiente |
| Cancelación | Con throttling, cambiar filtros o abandonar la página durante una consulta | La solicitud anterior se cancela o su respuesta no modifica la pantalla actual | Pendiente |
| `/familias/nueva` | Abrir y consultar comunidades; dejar obligatorios vacíos o nombre solo con espacios; enviar | No hay POST inválido; errores asociados; foco en primer campo inválido | Pendiente |
| Límites de campos | Comprobar máximos de 150/2000 caracteres y fecha opcional | Controles mantienen límites; ayudas legibles; sin campos añadidos | Pendiente |
| Registro válido | Solo con API aislada, completar datos sintéticos autorizados y pulsar Guardar dos veces | Un POST; estado Guardando; payload original; redirección al expediente creado | Pendiente |
| Error al guardar | En entorno aislado, simular fallo de POST o respuesta de validación del backend | Valores conservados, mensaje general/de campo y guardado desbloqueado | Pendiente |
| Cancelar registro | Cambiar campos sin guardar y pulsar Cancelar | Vuelve al listado sin POST | Pendiente |
| `/familias/:id` | Consultar expediente de pruebas y otro con observaciones vacías | Nombre, ID, comunidad, municipio, estado, fecha y observaciones correctos | Pendiente |
| No encontrado | Consultar un ID numérico inexistente en la API de pruebas | Mensaje de no encontrado y enlace al listado; no copia local ni reintento de 404 | Pendiente |
| Caché de desarrollo | Seguir el procedimiento debajo, desconectar red y repetir consultas ya visitadas | Advertencia de copia local/solo lectura; sin envío ni sincronización automática | Pendiente |
| Dialog aislado | Ejecutar el harness temporal descrito debajo | Modal nativo, foco, Escape/backdrop y scroll restaurados | Pendiente |

**Caché offline:** exclusivamente con datos sintéticos y una sesión de desarrollo aislada, iniciar Vite con `VITE_ENABLE_FAMILY_OFFLINE_TESTS=true` en esa terminal. No modificar `.env` de producción ni VitePWA. Visitar listado y un expediente para guardar sus copias; luego activar Offline en Network sin recargar la aplicación y repetir esas consultas. Una búsqueda/página nunca visitada no debe mostrarse como si estuviera cacheada. No esperar una copia local tras 400/401/403/404. El flag sigue condicionado a `import.meta.env.DEV`; detener la sesión de pruebas al terminar.

**Dialog aislado, sin ruta/demo permanente:** en una copia local de pruebas, conservar el contenido de `apps/web/src/App.tsx`. Añadir temporalmente los imports de `useState`, Button y Dialog, la función siguiente y cambiar únicamente el retorno de App a `<ThemeProvider><DialogCheck /></ThemeProvider>`. Después de probar, restaurar manualmente solo este harness y su retorno/imports; comprobar que App no figure en el diff de entrega.

```tsx
function DialogCheck() {
  const [open, setOpen] = useState(false)
  const [backgroundClicks, setBackgroundClicks] = useState(0)
  return <div className="space-y-4 p-6">
    <Button type="button" onClick={() => setOpen(true)}>Abrir diálogo</Button>
    <Button type="button" onClick={() => setBackgroundClicks((value) => value + 1)}>Acción de fondo</Button>
    <p>Activaciones de fondo: {backgroundClicks}</p>
    <Dialog open={open} title="Verificación de diálogo" description="Prueba aislada sin datos personales." onClose={() => setOpen(false)} actions={<Button type="button" onClick={() => setOpen(false)}>Aceptar</Button>}>
      <label htmlFor="dialog-check-input">Campo de prueba</label>
      <input id="dialog-check-input" className="block rounded-lg border p-2" />
    </Dialog>
  </div>
}
```

Imports temporales: `useState` desde `react`, Button desde `@/components/ui/Button` y Dialog desde `@/components/ui/Dialog`; ThemeProvider ya existe en App. Verificar Tab/Shift+Tab, foco inicial en Cerrar, imposibilidad de activar el botón de fondo, Escape, Aceptar y clic en backdrop. El foco debe volver a Abrir diálogo. Comparar `document.body.style.overflow` antes/después y repetir abrir/cerrar para detectar bloqueos persistentes. Esta comprobación no se ha ejecutado en esta etapa.

## Informe de QA integral — Etapas 1, 2 y 3

**Fecha:** 2026-10-13. **Rama:** `feat/tailadmin-pro-families`.

**Dictamen:** frontend aprobado en el entorno sintético descrito abajo; **NO-GO para una aprobación integral e incondicional de fusión a main** hasta ejecutar el smoke test con una API/base de datos de pruebas aisladas. No quedan fallos abiertos entre las 56 pruebas de navegador ejecutadas, pero no se ha validado la integración real. Este informe actualiza los resultados históricos de las secciones anteriores: sus matrices pendientes no implican que las pruebas posteriores tampoco se hayan ejecutado.

### Entorno y protección de datos

- Edge instalado, versión `Edg/155.0.4283.45`, automatizado en modo headless mediante Chrome DevTools Protocol y WebSocket nativo de Node; no se instalaron dependencias.
- Perfil nuevo y evidencias fuera del repositorio, autorizados por el usuario. Sin cookies, IndexedDB ni credenciales del perfil habitual.
- Vite de desarrollo en `http://127.0.0.1:5178`, con `VITE_API_URL=/api` y `VITE_ENABLE_FAMILY_OFFLINE_TESTS=true` solo en el proceso de pruebas; no se modificaron archivos de entorno ni configuración PWA.
- **Todas las solicitudes de API se interceptaron antes de enviarse** y recibieron respuestas sintéticas. Se bloquearon recursos externos. No se inició el backend ni se escribió en una base de datos, de producción o de pruebas.
- IndexedDB sí se ejercitó realmente, pero únicamente en el perfil aislado y con familias `QA FAMILY`, comunidad `QA COMMUNITY` y demás datos sintéticos.
- Dialog se montó dinámicamente en un root temporal del navegador importando el componente real. El root se desmontó; no se añadió una ruta, pantalla demo ni cambio temporal a App.

### Evidencias y reproducción local

Directorio de evidencia final: `C:\Users\calde\AppData\Local\Temp\opencode\tailadmin-qa-release-check`.

- `results.json`: 56 resultados individuales, solicitudes interceptadas, errores de runtime y cancelaciones. Ejecución final: `2026-10-13T21:47:15.271Z`.
- SHA-256 de `results.json`: `be5ca091989d3f2c4972cdb0114a849b51fb4309010c94b8a6231555ab06497c`.
- 30 capturas PNG, una por combinación de viewport/ruta/tema. Son capturas del viewport, no una auditoría visual completa de toda la página.
- Arnés local: `C:\Users\calde\AppData\Local\Temp\opencode\tailadmin-qa.cjs`. No está incorporado al repositorio ni a CI. Su disponibilidad depende de conservar el directorio temporal.
- Evidencias anteriores conservadas en `tailadmin-qa-baseline`, `tailadmin-qa-verification` y `tailadmin-qa-focus-probe`. Los errores de instrumentación se distinguieron de defectos del producto y se corrigieron antes de la ejecución final.

Para reproducir **sin backend**, usar una terminal dedicada desde la raíz:

```powershell
$env:VITE_API_URL = '/api'
$env:VITE_ENABLE_FAMILY_OFFLINE_TESTS = 'true'
npm run dev -w @viviendas-leon/web -- --host 127.0.0.1 --port 5178 --strictPort
```

En otra terminal, conservando el arnés autorizado, ejecutar `node "C:\Users\calde\AppData\Local\Temp\opencode\tailadmin-qa.cjs" qa-repeat`. Debe estar libre el puerto de DevTools `9227`. El arnés crea otro perfil aislado, intercepta la API y cierra su Edge al terminar. Detener Vite y cerrar la terminal de flags al finalizar; nunca reutilizar ese perfil para datos reales.

### Resultados funcionales de navegador

Cada ID corresponde a una entrada de `results.json`. **Aprobada** aquí significa aprobada contra las respuestas sintéticas interceptadas, no contra el backend real.

| ID | Prueba | Estado final | Evidencia y límite |
|---|---|---|---|
| Q01 | `/familias`, datos y cabeceras | Aprobada | 20 filas sintéticas y 6 `th[scope=col]`; GET interceptado |
| Q02 | Búsqueda y Limpiar | Aprobada | `search` enviado y control restablecido |
| Q03 | Filtro por estado | Aprobada | `estado=RETIRADA`, `page=1`; 8 filas sintéticas |
| Q04 | Paginación | Aprobada | GET de página 2, 5 filas y botones deshabilitados en límites |
| Q05 | Vacío | Aprobada | Mensaje sin coincidencias y recuperación al limpiar |
| Q06 | Error de listado y reintento | Aprobada | HTTP 503 sintético en consulta no cacheada; recuperación |
| Q07 | Carga y cancelación | Aprobada | `aria-busy=true`, petición cancelada al navegar; respuesta tardía no cambia la ruta |
| Q08 | Formulario vacío | Aprobada | Sin POST; primer error enfocado; atributos ARIA enlazados |
| Q09 | Espacios y límites de campo | Aprobada | Espacios y valores de 151/2001 caracteres rechazados; el input date normaliza fecha imposible. No acredita por sí sola la validación personalizada de fechas |
| Q10 | Error de guardado | Aprobada | HTTP 422 sintético; error por campo, valores conservados y desbloqueo |
| Q11 | Doble envío, payload y redirección | Aprobada | Un único POST interceptado, payload normalizado y `/familias/100`; ningún registro real |
| Q12 | Expediente y 404 | Aprobada | Campos, ausencia de fecha/observaciones y 404 sin reintento |
| Q13 | Comunidades, vacío y Cancelar | Aprobada | Error/reintento, comunidades vacías, Guardar bloqueado y cancelación sin POST |
| Q14 | Nombre accesible del toggle de escritorio | Aprobada | Árbol de accesibilidad: `Colapsar navegación`; corregido H01 |
| Q15 | Sidebar colapsado y expansión por teclado | Aprobada | Anchos medidos de 90/290px |
| Q16 | Sidebar móvil: foco, Tab y Escape | Aprobada | Foco inicial y Tab/Shift+Tab dentro del menú; retorno al toggle y scroll restaurado; corregido H02 |
| Q17 | Enlace móvil y backdrop | Aprobada | Navegación cierra menú y elimina `inert`; backdrop restaura scroll |
| Q18 | Avisos y selector de rol | Aprobada | Escape cierra paneles y devuelve foco al botón de avisos |
| Q19 | Tema y persistencia | Aprobada | Cambio real de tema y conservación tras recarga completa |
| Q20 | Dialog nativo aislado | Aprobada | `:modal`, foco inicial, Tab, Escape/backdrop, devolución al abridor y restauración de `overflow: scroll !important`. Edge puede llevar Tab a su chrome; ningún control de fondo pudo recibir foco |
| Q21 | Caché offline | Aprobada | IndexedDB real aislado; listado/detalle cacheados, ausencia de copia y ningún POST adicional |
| Q22 | Conectividad y recuperación | Aprobada | API sintética no disponible/recuperada; no anuncia `Sincronizado` |
| Q23 | Excepciones de runtime | Aprobada | Cero excepciones no capturadas; fallos HTTP inyectados son esperados |
| Q24 | Submenú activo y rol mock | Aprobada | Enter abre/cierra submenú; audit oculta Familias y fieldWorker la vuelve a mostrar |
| Q25 | Caché ante 400/401/403/404 | Aprobada | Copia sintética preexistente no se muestra tras cada denegación/error |
| Q26 | Teclado en tabla y formulario | Aprobada | ArrowRight desplaza tabla; Tab pasa a comunidad y muestra anillo de foco |

### Responsive y temas — 30 pruebas

Todos los casos verificaron `scrollWidth <= clientWidth` del documento, tema persistido y generaron captura. La tabla mantiene overflow horizontal propio. Los cinco casos de formulario oscuro también verificaron `colorScheme === 'dark'` del control de fecha después de H04.

| Viewport | Listado claro | Listado oscuro | Registro claro | Registro oscuro | Expediente claro | Expediente oscuro |
|---|---|---|---|---|---|---|
| 320px | Aprobada | Aprobada | Aprobada | Aprobada | Aprobada | Aprobada |
| 375px | Aprobada | Aprobada | Aprobada | Aprobada | Aprobada | Aprobada |
| 768px | Aprobada | Aprobada | Aprobada | Aprobada | Aprobada | Aprobada |
| 1024px | Aprobada | Aprobada | Aprobada | Aprobada | Aprobada | Aprobada |
| 1440px | Aprobada | Aprobada | Aprobada | Aprobada | Aprobada | Aprobada |

IDs y capturas: `V{ancho}-{familias|nueva|1}-{light|dark}`. La comprobación geométrica no equivale a contraste WCAG medido ni revisión humana de las 30 imágenes. Se revisaron visualmente capturas seleccionadas, incluidos registro oscuro a 320/768px y listado de escritorio.

### Defectos comprobados y corregidos

| ID | Estado inicial | Defecto/evidencia | Corrección | Estado final |
|---|---|---|---|---|
| H01 | Fallida | Q14: nombre accesible vacío en escritorio; `hidden` permanecía aplicado al texto para lectores | `AppHeader.tsx`: visibilidad responsive del nombre accesible | Aprobada, Q14 |
| H02 | Fallida | Q16 y focus-probe: menú visible pero foco inicial en BODY | `AppSidebar.tsx`: foco después de dos frames de visibilidad, cancelación del frame al cerrar y fallback al toggle tras `inert` | Aprobada, Q16/Q17 |
| H03 | Fallida | A 320px, documento de 320px frente a clientWidth de 305px por scrollbar vertical | `index.css`: eliminar mínimo global de 320px, sin ocultar overflow | Aprobada, seis casos V320 |
| H04 | Fallida en revisión visual | Indicador nativo de fecha oscuro sobre fondo oscuro; captura de regression a 768px | `FormField.tsx`: `dark:scheme-dark` para controles nativos | Aprobada, cinco comprobaciones de esquema y capturas finales |

Los fallos de importación del arnés de Dialog, temporización de reload/resize y generación incompleta de Enter fueron defectos de instrumentación, no fallos del producto. No se modificó Dialog para impedir que Tab alcance la interfaz propia del navegador.

### Build, lint y alcance

| ID | Prueba | Estado | Evidencia |
|---|---|---|---|
| B01 | `npm run build` raíz | Aprobada | TypeScript API/web, Vite y generación de artefactos PWA sin errores; sin ejecutar backend |
| B02 | `npm run lint` raíz | Aprobada | oxlint sin errores |
| B03 | `git diff --check` | Aprobada | Sin errores de whitespace; avisos LF/CRLF no bloqueantes |
| S01 | Restricciones de modificación | Aprobada | Diff sin backend, familias, servicios, rutas, roles, IndexedDB, cola, PWA ni paquetes |
| S02 | Gate de caché en producción | Aprobada, estática | Se conserva `DEV && VITE_ENABLE_FAMILY_OFFLINE_TESTS === 'true'`; no es una prueba del service worker de producción |

### No ejecutadas y cierre de QA

| ID | Prueba | Estado | Motivo / procedimiento de cierre |
|---|---|---|---|
| N01 | Integración GET/POST con API y BD de pruebas | No ejecutada | No se confirmó un entorno real aislado. Confirmarlo y repetir listado, filtros/páginas, comunidades, creación y expediente usando únicamente datos sintéticos |
| N02 | Lectores de pantalla y contraste WCAG completo | No ejecutada | Sin lector ni medición exhaustiva. Usar NVDA/VoiceOver, revisar nombres/mensajes/foco y medir contraste en ambos temas |
| N03 | Safari, Firefox y dispositivos táctiles | No ejecutada | Solo Edge headless disponible en esta ejecución. Repetir matriz en Safari/Firefox y dispositivo físico |
| N04 | Service worker y PWA instalada de producción | No ejecutada | Se probó Vite DEV, no un despliegue productivo. En staging aislado, probar instalación/actualización y recursos offline, sin habilitar caché sensible |
| N05 | Auditoría visual completa de todas las páginas/estados | No ejecutada | Capturas de viewport y revisión selectiva, no revisión completa de cada imagen ni de todos los módulos |

**Criterio de fusión:** cerrar N01 como smoke test mínimo de integración antes de aprobar la fusión integral a main. Registrar o aceptar explícitamente los riesgos N02–N05 según la política del proyecto. El frontend no presenta fallos abiertos en el entorno automatizado, pero esta evidencia no certifica backend, seguridad, PWA de producción ni compatibilidad multinavegador. No se hizo commit, push ni merge.
