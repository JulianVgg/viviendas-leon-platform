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

**Dictamen actualizado:** frontend aprobado en las 56 pruebas con respuestas sintéticas y **N01 GO tras 14 pruebas de integración real aprobadas**, documentadas al final de este informe. El bloqueo de integración de familias está cerrado. Se recomienda integrar las Etapas 1–3 tras revisión del diff y aceptación explícita de los pendientes N02–N05; no es una certificación de seguridad ni autorización para producción con beneficiarios reales. Se conservan los resultados históricos para trazabilidad.

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
| N01 | Integración GET/POST con API y BD de pruebas | **Aprobada — GO** | Nueva instancia exclusiva QA autorizada, aislamiento verificado y 14 pruebas reales aprobadas. Ver cierre N01 al final |
| N02 | Lectores de pantalla y contraste WCAG completo | No ejecutada | Sin lector ni medición exhaustiva. Usar NVDA/VoiceOver, revisar nombres/mensajes/foco y medir contraste en ambos temas |
| N03 | Safari, Firefox y dispositivos táctiles | No ejecutada | Solo Edge headless disponible en esta ejecución. Repetir matriz en Safari/Firefox y dispositivo físico |
| N04 | Service worker y PWA instalada de producción | No ejecutada | Se probó Vite DEV, no un despliegue productivo. En staging aislado, probar instalación/actualización y recursos offline, sin habilitar caché sensible |
| N05 | Auditoría visual completa de todas las páginas/estados | No ejecutada | Capturas de viewport y revisión selectiva, no revisión completa de cada imagen ni de todos los módulos |

**Criterio de fusión:** N01 ya está cerrada como smoke test de integración. Revisar los cambios y registrar o aceptar explícitamente los riesgos N02–N05 según la política del proyecto. Esta evidencia no certifica seguridad, PWA de producción ni compatibilidad multinavegador. No se hizo commit, push ni merge.

## Intento anterior N01 — Bloqueo por ausencia de aislamiento

Registro histórico del intento sin autorización para crear una instancia nueva. Sus estados de bloqueo fueron superados por el cierre N01 documentado debajo; no describen el estado actual.

**Fecha:** 2026-10-13. **Rama:** `feat/tailadmin-pro-families`. **Dictamen: NO-GO; N01 bloqueada por aislamiento no confirmado.** El bloqueo de integración de familias sigue abierto. No se sustituyó esta prueba por las respuestas sintéticas de la validación anterior.

### Preparación y evidencia de aislamiento

| Comprobación | Estado | Evidencia / alcance |
|---|---|---|
| Git y rama | Aprobada | Rama solicitada; árbol de trabajo limpio al iniciar. Sin sobrescrituras |
| Documentación de entorno e informe QA | Aprobada | Leídos `docs/environment-setup.md` y el informe integral. La documentación describe `viviendas_leon` como base local de desarrollo, no exclusiva de QA |
| Configuración y contratos | Aprobada, inspección | Revisados Express, PrismaPg, configuración Prisma 7, esquema, migraciones disponibles, controladores, validaciones, catálogo de comunidades y servicios React. No acredita integración ejecutada |
| PostgreSQL local disponible | Aprobada, metadatos | `docker ps` mostró `viviendas-leon-postgres`, imagen `postgres:17-alpine`, puerto publicado solo en `127.0.0.1:5432`. Disponibilidad no implica aislamiento de datos |
| Destino de conexión habitual | Aprobada, inspección sanitizada | `apps/api/.env` apunta a host local, puerto 5432 y base `viviendas_leon`. No se encontraron variables alternativas TEST/QA de conexión en ese archivo o el proceso. No se imprimió la URL, usuario ni contraseña |
| Base exclusiva de pruebas | **Bloqueada** | Consulta real de `pg_database`: únicamente `postgres` y `viviendas_leon`, ambas sin marcador explícito de exclusividad de pruebas. No se consultaron tablas de negocio |

La única conexión SQL de esta comprobación se dirigió a la base administrativa **`postgres`**, con `default_transaction_read_only=on`. `SHOW transaction_read_only` devolvió `on`. Se consultaron únicamente nombres/permisos de conexión de bases y presencia de una descripción explícita de exclusividad; las descripciones completas no se imprimieron. No se inspeccionaron registros de beneficiarios ni se conectó a tablas de `viviendas_leon`.

Consulta de metadatos reproducible, usando credenciales fuera de consola/chat y una conexión administrativa local de solo lectura:

```sql
SHOW transaction_read_only;
SELECT datname, datallowconn
FROM pg_database
WHERE NOT datistemplate
ORDER BY datname;
```

Resultado observado: `postgres` y `viviendas_leon`, con conexiones permitidas. Una base local o un nombre que parezca de QA **no basta** para certificar exclusividad: se requiere una base designada y confirmada como ajena a datos reales/entorno habitual. Esta inspección no descarta otras instancias externas; ninguna fue proporcionada o confirmada para esta prueba.

### Integración solicitada — estado individual

Sin una base de pruebas confirmada, no se inició API/frontend para N01 ni se ejecutaron sus peticiones. En la columna HTTP se registran respuestas **observadas**, no las previstas por el código.

| ID | Prueba | Estado | HTTP observado / evidencia |
|---|---|---|---|
| N01-H | `GET /api/health` del entorno aislado | No ejecutada, bloqueada | Ninguno; API de QA no iniciada |
| N01-01 | Consultar comunidades activas | No ejecutada, bloqueada | Ninguno |
| N01-02 | Mostrar listado desde React y API real | No ejecutada, bloqueada | Ninguno |
| N01-03 | Búsqueda por texto | No ejecutada, bloqueada | Ninguno |
| N01-04 | Filtro por estado | No ejecutada, bloqueada | Ninguno |
| N01-05 | Paginación del servidor | No ejecutada, bloqueada | Ninguno |
| N01-06 | Expediente existente | No ejecutada, bloqueada | Ninguno |
| N01-07 | Expediente inexistente | No ejecutada, bloqueada | Ninguno |
| N01-08 | Registrar familia QA desde frontend | No ejecutada, bloqueada | Sin POST ni registro |
| N01-09 | Un único POST y respuesta 201 | No ejecutada, bloqueada | No se observó HTTP 201 real |
| N01-10 | Verificar persistencia en PostgreSQL | No ejecutada, bloqueada | Sin registro creado ni consulta a tablas de negocio |
| N01-11 | Redirección al expediente creado | No ejecutada, bloqueada | Sin expediente de prueba |
| N01-12 | Recarga y recuperación desde API | No ejecutada, bloqueada | Ninguno |
| N01-13 | Entrada inválida sin persistencia | No ejecutada, bloqueada | Sin POST ni verificación de persistencia |
| N01-14 | Recuperación ante error controlado | No ejecutada, bloqueada | No se alteró API/base habitual para provocar errores |

### Escrituras, limpieza y verificaciones

- No se creó una base, no se configuró temporalmente otra conexión y no se modificó ningún `.env`.
- No se ejecutaron migraciones, seed, preparación de fixtures, INSERT/UPDATE/DELETE, limpieza global ni limpieza selectiva. **IDs creados: ninguno; limpieza: no necesaria.**
- `npm run build` desde la raíz: **aprobada**, TypeScript API/frontend, Vite y generación de artefactos PWA sin errores. Compilar la API no inició Express ni abrió Prisma contra datos de negocio.
- `npm run lint` desde la raíz: **aprobada**, oxlint sin errores.
- `git diff --check`: **aprobada**; los posibles avisos LF/CRLF no son errores de whitespace.
- Único archivo de entrega modificado durante este intento: `docs/frontend/componentes-base.md`. Servicios, contratos, rutas, roles, autenticación, backend, Prisma, IndexedDB, cola y PWA permanecen sin cambios.

### Requisito para desbloquear y completar N01

Proporcionar y confirmar una base **existente y exclusivamente destinada a QA**, con host/puerto/nombre identificables y sin datos reales. La conexión debe configurarse de forma segura fuera de logs/chat y solo para el proceso de prueba. Si se necesita crear un entorno nuevo, eso requiere una autorización explícita adicional; no se asumió que la base habitual pudiera reutilizarse o limpiarse.

Una vez confirmado el aislamiento: aplicar solo migraciones pendientes de esa base, crear fixtures QA registrando sus IDs, iniciar Express y Vite, repetir N01-H y N01-01–14 con solicitudes reales, verificar el alta directamente en PostgreSQL y limpiar solo IDs propios previamente comprobados. Registrar respuestas y consultas sanitizadas. Hasta entonces **no se aprueba la fusión integral a main**. Incluso un futuro GO de N01 no certificará seguridad, PWA de producción ni compatibilidad multinavegador. Sin commit, push ni merge.

## Cierre N01 — Integración real en PostgreSQL exclusivo de QA

**Fecha de ejecución:** `2026-10-13T22:13:26.156Z`. **Rama:** `feat/tailadmin-pro-families`.

**Dictamen N01: GO. 14 aprobadas, 0 fallidas, 0 no ejecutadas.** Se cierra el bloqueo de integración de familias. La numeración de esta tabla sigue la última solicitud: health es N01-01; no debe confundirse con la numeración del intento histórico bloqueado.

### Autorización, preparación y aislamiento efectivo

El usuario autorizó expresamente un contenedor/volumen nuevos y archivos locales protegidos fuera de Git. Se conservó el cambio local previo de este documento; no se descartó trabajo existente.

| Comprobación | Evidencia observada | Resultado |
|---|---|---|
| Contenedor exclusivo | `viviendas-leon-qa-postgres`, ID `c9878fa14e02cabacc4503a076f53cc3aeab03a401c0a49b94696d875f84f815` | Aprobada |
| Imagen y versión real | `postgres:17`; PostgreSQL `17.11 (Debian 17.11-1.pgdg13+2)` | Aprobada |
| Puerto publicado | Solo `127.0.0.1:5433` hacia 5432 interno del contenedor | Aprobada |
| Volumen exclusivo | `viviendas-leon-qa-data`, distinto en nombre y origen de `viviendas-leon-postgres-data` | Aprobada |
| Base y usuario efectivos | `SELECT current_database(), current_user` devolvió `viviendas_leon_qa`, `viviendas_qa` | Aprobada |
| Dirección del servidor QA | `172.17.0.3`, puerto interno 5432. El puerto cliente/publicado es 5433; no se conectó al 5432 del host para estas pruebas | Aprobada |
| Conexión temporal API | Host `127.0.0.1`, puerto **5433**, base `viviendas_leon_qa`, usuario `viviendas_qa`; URL completa nunca registrada | Aprobada |
| Proceso Prisma real | `pg_stat_activity` mostró sesiones `qa_n01_api` en base/usuario QA | Aprobada |
| Separación del entorno habitual | Contenedor habitual ID `7b7b578c90107b8fe468fed3ab78cef99ef08728507affa986a2d0a6c9ae0adb`; huella de configuración/montajes y hashes de archivos `.env` sin cambios | Aprobada |

Esta barrera se ejecutó **antes** de migraciones y fixtures y se repitió al conectar/verificar/reiniciar QA. Cualquier discrepancia provoca aborto del arnés. El contenedor y volumen QA no existían previamente; se etiquetaron `viviendas.purpose=exclusive-n01-qa`.

La contraseña se generó con 36 bytes aleatorios, sin reutilizar credenciales habituales. Se conserva en un archivo local separado, fuera de Git y de las evidencias, con ACL limitada al usuario actual y SYSTEM. Docker recibió `POSTGRES_PASSWORD_FILE` mediante montaje de solo lectura, no una contraseña literal en argumentos ni en `docker inspect` de variables de creación. La API recibió su conexión únicamente por entorno de proceso. No se modificó `apps/api/.env` ni el entorno habitual. No exportar el directorio `private` ni el perfil de navegador.

### Migraciones y datos preparados

Se ejecutó Prisma `migrate deploy --config prisma7.config.ts`, desde `apps/api`, usando exclusivamente la conexión QA validada. Se aplicaron correctamente las cuatro migraciones existentes, sin modificarlas:

1. `20261004070402_init`
2. `20261005034229_update_schema_normalized`
3. `20261005050000_add_db04_indexes`
4. `20261005060000_adjust_db04_foreign_keys`

El seed general fue revisado: utiliza datos sintéticos, pero crea módulos/relaciones ajenos a N01. **No se ejecutó.** En la base nueva vacía se prepararon fixtures SQL mínimos con prefijo **`QA_N01_20261013220411`**: municipio ID 1, comunidad activa ID 1 y familias IDs 1–25, con 21 ACTIVA y 4 RETIRADA. Los IDs se registraron en `fixtures.json`. No se usaron datos personales ni beneficiarios reales.

### API, frontend y ausencia de simulación

3000 y 5173 estaban ocupados por procesos preexistentes (PIDs 7828 y 18460); no se reutilizaron ni se detuvieron. Se iniciaron únicamente procesos propios:

- API real: `http://127.0.0.1:3001`, PID 26012, importando la aplicación Express compilada actual, con PrismaPg y PostgreSQL QA. El launcher temporal verificó la identidad SQL antes de escuchar.
- Frontend real: `http://127.0.0.1:5178`, PID 24372, Vite con la configuración actual y un override programático temporal de proxy `/api` hacia `http://127.0.0.1:3001`. No se modificó `vite.config.ts` ni VitePWA.
- `VITE_API_URL=/api`; caché de familias deshabilitado para N01. Perfil nuevo de Edge `155.0.4283.45`; caché HTTP y service worker bypassed durante esta comprobación.
- El arnés observó eventos de Network y códigos HTTP. **No habilitó Fetch interception, no fabricó respuestas, no sustituyó fetch ni servicios.** Bloqueó destinos habituales/externos por seguridad, sin sustituir respuestas de QA. Todas las solicitudes API del navegador pertenecieron al origen QA.

### Resultados individuales

| ID | Prueba ejecutada | Estado | HTTP observado y evidencia |
|---|---|---|---|
| N01-01 | Health directo y a través del proxy QA | Aprobada | 200/200; `status=ok`, identidad de proceso/base QA comprobada |
| N01-02 | Catálogo de comunidades activas | Aprobada | 200; comunidad ID 1 coincide con JOIN real de comunidad/municipio activos y sesión Prisma QA |
| N01-03 | Listado y contrato de respuesta | Aprobada | 200; 20 filas, total 25 y estructura de pagination/programas/integrantes correctas, comparados con SQL |
| N01-04 | Búsqueda desde React | Aprobada | 200; `search=FAMILY+01&page=1&limit=20`; resultado ID 1 coincide con SQL ILIKE |
| N01-05 | Filtro de estado desde React | Aprobada | 200; `estado=RETIRADA`, cuatro resultados, igual al conteo SQL |
| N01-06 | Paginación real del servidor | Aprobada | 200; 20 filas en página 1, cinco en página 2, totalPages=2 y límite deshabilitado |
| N01-07 | Expediente existente | Aprobada | 200; ID 1, nombre, fecha, estado, observaciones, comunidad y municipio comparados contra SQL; captura |
| N01-08 | Expediente inexistente | Aprobada | 404 real, código `FAMILY_NOT_FOUND`; ID 2147483000 confirmado ausente por SQL |
| N01-09 | Alta desde formulario React | Aprobada | Guardado real mediante formulario; ID generado 26. Un lock transitorio de la comunidad exclusivamente QA permitió observar Guardando/campos bloqueados antes de liberar la transacción |
| N01-10 | Doble envío y único POST | Aprobada | Dos intentos consecutivos del formulario originaron **un solo POST**, respuesta **201** y `X-Powered-By: Express`; payload normalizado original |
| N01-11 | Persistencia independiente | Aprobada | SELECT real encontró familia ID 26, nombre `QA_N01_20261013220411 UI CREATED`, comunidad 1, estado ACTIVA, fecha 2026-10-13 y observaciones QA; total final 26 |
| N01-12 | Redirección y recarga completa | Aprobada | Ruta `/familias/26`; nuevo GET real 200 después de reload con caché deshabilitado; captura del dato persistido |
| N01-13 | Entrada inválida sin persistencia | Aprobada | Formulario vacío no emitió POST. POST inválido directo a la misma API QA devolvió **400**, `VALIDATION_ERROR` y errores de comunidad/fecha/observaciones. SQL: total 26 antes/después y cero registros con nombre inválido |
| N01-14 | Error real y recuperación | Aprobada | Se detuvo temporalmente **solo** PostgreSQL QA: Prisma P1001 y GET **500** real, mensaje genérico en React. Se reinició la misma instancia, se revalidó identidad y Reintentar obtuvo **200**; 26 filas conservadas |

Los errores Prisma P1001 del log corresponden al fallo **deliberado** N01-14, no a un fallo abierto. Health actual comprueba que Express responde; no certifica salud de la base. No se cambió esa lógica.

### Evidencia reproducible y conservación

Ubicación estable autorizada, fuera del repositorio:

`C:\Users\calde\.local\share\opencode\qa\viviendas-leon-n01-20261013`

Compartir solo `evidence`, que fue verificado sin contraseñas ni URLs de PostgreSQL completas:

- `isolation.json`, `baseline.json`: identidad QA y separación del contenedor/entorno habituales, sin credenciales.
- `migrations.txt`, `fixtures.json`: migraciones y manifiesto de IDs/prefijo.
- `api-process.json`, `frontend-process.json`: procesos, puertos y destino de proxy.
- `n01-results.json`: las 14 pruebas, HTTP reales y observaciones de Network. SHA-256: `2b2a63131aaa50ad495fe93ea9fb259c3f7af62daf13765c1e2b5c7b0ffa1e93`.
- `persisted-family.json`: resultado de SELECT independiente de la familia 26.
- Capturas de expediente, guardado, validación, error real y recuperación.
- `verification.json`: comprobaciones finales y hashes de evidencias. Logs sanitizados conservados para reproducir el diagnóstico.

Los scripts locales `setup.cjs`, `api-runner.cjs`, `frontend-runner.mjs`, `servers.cjs`, `integration.cjs` y `verify.cjs` no modifican código de producción. `setup.cjs` se niega a sobreescribir un contenedor, volumen o secreto ya existente. **No ejecutarlo de nuevo para recrear este entorno.** Para revisar evidencia, `node "C:\Users\calde\.local\share\opencode\qa\viviendas-leon-n01-20261013\verify.cjs"` valida resultados, separación y ausencia de secretos sin escrituras de negocio.

Para repetir pruebas con esta instancia, revisar primero su procedencia/aislamiento y preparar otro manifiesto/prefijo; el smoke actual presupone una base recién creada con 25 fixtures y no debe repetirse a ciegas sobre los 26 registros conservados. La contraseña permanece disponible exclusivamente en el archivo protegido para conexión local. No copiarla al informe ni a argumentos de comandos.

Se conservaron **municipio 1, comunidad 1 y familias 1–26** en QA, claramente identificados. No se ejecutaron DELETE globales, TRUNCATE, DROP, migrate reset, db push ni limpieza de desarrollo. El contenedor y volumen QA quedan **conservados y operativos**. Los procesos temporales API/Vite/Edge se cerraron; los puertos 3001/5178 quedaron libres. Las variables temporales desaparecieron con esos procesos. Los procesos habituales de 3000/5173 siguieron activos con sus mismos PIDs.

### Repositorio, límites y recomendación

- `npm run build`: **aprobada**, API/web, TypeScript, Vite y artefactos PWA.
- `npm run lint`: **aprobada**, sin errores.
- `git diff --check`: **aprobada**, solo avisos LF/CRLF no bloqueantes.
- Único archivo versionado modificado en esta tarea: **`docs/frontend/componentes-base.md`**, conservando su cambio local previo. Sin cambios en apps/api/src, servicios/contratos de familias, schema, migraciones, IndexedDB, offline, roles/navegación, autenticación, VitePWA ni dependencias.
- No se ejecutó SQL de prueba ni escritura contra `viviendas_leon` o el contenedor habitual. Sus IDs/configuración/montajes y los archivos `.env` se comprobaron sin cambios. Esta afirmación se refiere a las operaciones de esta tarea; no audita actividad independiente de otros procesos del usuario.

**Recomendación:** GO de N01 y cierre del bloqueo técnico de integración de familias; se recomienda fusionar las Etapas 1–3 tras revisión del diff y aceptación/documentación de N02–N05. No equivale a un GO para producción con datos reales: autenticación/autorización siguen pendientes y no se certificaron seguridad, PWA productiva ni compatibilidad multinavegador. No se hizo commit, push ni merge.

## Sidebar institucional — Reorganización posterior a Etapas 1–3

**Fecha:** 2026-10-13. **Base:** `feat/tailadmin-pro-families`, commit `9b3ffe4` (`feat: pruebas QA y correcciones`). **Rama de revisión:** `feat/sidebar-institutional-navigation`. Estado inicial limpio; sin commit, push ni merge.

### Jerarquía, rutas e iconografía

Orden institucional completo visible para `coordination`; otros roles reciben únicamente las opciones autorizadas. «Panel principal» es un enlace independiente, sin encabezado repetido. Los otros seis títulos son botones de submenú, sin enlace general adicional.

| Sección / SVG conceptual | Subopción | Destino existente / estado |
|---|---|---|
| Panel principal / Dashboard | Panel principal (enlace único) | `/` |
| Familias / Users | Listado de familias | `/familias` |
| | Registrar familia | `/familias/nueva` |
| Gestión agrícola / Sprout | Huertos y cultivos | `/gestion-agricola` |
| | Producción y cosechas | `/gestion-agricola/produccion` |
| | Costos y ventas | En preparación |
| Visitas técnicas / ClipboardList | Agenda de visitas | `/actividades/visitas` |
| | Registrar visita | En preparación |
| | Historial de visitas | En preparación |
| Capacitaciones / GraduationCap | Programación | `/actividades/capacitaciones` |
| | Participantes y asistencia | En preparación |
| Insumos e inventario / Package | Inventario | `/gestion-agricola/insumos` |
| | Movimientos | En preparación |
| Seguimiento y reportes / Chart | Seguimiento de familias | En preparación |
| | Indicadores | `/reportes/indicadores` |
| | Reportes | `/reportes/reportes` |

Las seis opciones pendientes son texto con `aria-disabled="true"`, sin `href`, manejador de navegación ni `tabIndex`. No se incorporaron rutas ficticias, páginas demo, servicios, fixtures ni dependencias. Las rutas base distintas de familias ya existían como pantallas base; habilitar un enlace no implica implementar su funcionalidad.

Los siete SVG reutilizables están en `components/icons/index.tsx`, mediante `NavigationIcon`: `size-6`, `currentColor`, trazo de 1.5 y ocultos al árbol accesible porque el control ya tiene nombre. Se conserva `AppIcon` para usos heredados y para no rediseñar Auditoría/Administración. No se recibió una imagen adjunta en esta sesión: se siguió la organización/iconografía textual solicitada, no estilos de una referencia externa.

### Diseño PRO y comportamiento

- Se conservan `layout-menu-item`, `layout-menu-active`, `layout-menu-inactive`, `layout-focus`, tokens brand, fondos claros/oscuros, espaciados, transiciones, ancho 290/90px y breakpoint de escritorio de 1280px. Sin cambios en `index.css`, header, layout ni providers.
- Los submenús tienen estado independiente: abrir uno no cierra los otros. Pueden colapsarse manualmente; al cambiar de ruta se abre el grupo correspondiente, manteniendo los demás estados del mismo rol. Cambiar de rol descarta estados de otro rol.
- Se selecciona el grupo por la ruta hija más específica: `/gestion-agricola/insumos` corresponde a inventario, no al enlace agrícola general. Las hojas `/familias` y `/gestion-agricola` se resaltan solo por coincidencia exacta, evitando dos hojas activas. Un expediente `/familias/:id` mantiene abierto Familias, sin atribuirle una hoja incorrecta.
- Se mantienen hover, expansión por foco, `aria-expanded`, `aria-controls`, botones nativos para Enter/Espacio y `hidden` en submenús no visibles para excluir enlaces del orden de Tab.
- Se conserva el efecto móvil existente: foco después de dos frames, Escape, ciclo Tab/Shift+Tab, backdrop, cierre al navegar, restauración de foco y del valor anterior de `body.style.overflow`.
- H01/H03/H04 permanecen sin cambios en sus archivos originales; H02 se conserva en AppSidebar. Se revalidaron foco/Escape y overflow de H02/H03. No se repitió la prueba específica del control de fecha H04 ni toda la suite histórica de familias/N01.

### Roles y diferencias con AUTH-01

El filtro conserva el mecanismo mock y añade evaluación de restricciones hijas dentro del acceso permitido por el padre; un hijo nunca autoriza un padre denegado. Esto es visibilidad, **no autenticación ni autorización backend**.

| Rol mock | Visibilidad institucional |
|---|---|
| `fieldWorker` | Panel principal, Familias, Gestión agrícola, Visitas técnicas, Capacitaciones, Insumos e inventario; Seguimiento y reportes muestra solo Seguimiento de familias pendiente. No Costos y ventas, Indicadores ni Reportes. |
| `coordination` | Las siete secciones y todas sus subopciones. |
| `operationsDirector` | Panel principal; Seguimiento y reportes con Indicadores y Reportes, sin Seguimiento de familias. |
| `administration` | Solo Panel principal en el sidebar; Configuración de cuenta en el header conserva su acceso anterior. |
| `audit` | Panel principal y navegación heredada de Auditoría (Vista general y Bitácora). |

Seguimiento de familias hereda el alcance operativo de familias/visitas, **no** el permiso de reportes; agruparlo no concede reportes al personal de campo ni familias a la dirección. Costos y ventas permanece deshabilitado y se restringe conservadoramente a coordinación, excluyendo personal de campo según AUTH-01 para contabilidad. No se introduce acceso operativo a roles que antes no lo tenían.

**Conflictos a resolver por el equipo AUTH-01:** los IDs mock no equivalen todavía a los roles de negocio. La matriz prevé acceso operativo completo para Directora y acceso administrativo parcial para Coordinadora; el frontend heredado es más restrictivo. También faltan alcances limitados/solo lectura para Contadora/Auditor en familias, insumos y reportes. No se amplían estos permisos en esta entrega. El significado contable de Costos y ventas y su autorización definitiva deben confirmarse antes de habilitarlo; tampoco se implementan restricciones por registros propios/asignados.

### Exclusiones y futura Etapa 4

**Administración queda excluida únicamente del sidebar reorganizado** mediante `sidebarHidden`; su configuración original sigue disponible para `navigationForRole` y para el enlace del header. No se cambian sus rutas, componentes ni permisos. Su visibilidad futura deberá coordinarse con el responsable del módulo. Auditoría conserva su grupo heredado para `audit`, fuera de la jerarquía operativa nueva, sin rediseño ni cambios de rutas/permisos.

Voluntariado, vistas agrícolas separadas, asistencia técnica y alertas dejan de figurar en la jerarquía solicitada, pero **todas sus rutas existentes se conservan** en `routes.tsx`. No se interviene en backend, Prisma, PostgreSQL QA, familias funcionales, IndexedDB, offline, VitePWA, autenticación, visitas ni capacitaciones funcionales.

Etapa 4 puede sustituir opciones pendientes por destinos reales y permisos aprobados sin reemplazar el sidebar ni el sistema visual. No habilitar una opción únicamente porque se cree su ruta: confirmar representación funcional, autorización y pruebas primero.

### Pruebas de esta entrega

- `npm run build` inicial y posterior: aprobado (workspaces API/web, TypeScript/Vite/PWA).
- `npm run lint` inicial y posterior: aprobado.
- `git diff --check`: aprobado; avisos LF/CRLF no bloqueantes.
- Brave real en modo headless, perfil temporal aislado, CDP; ejecutable `Brave Browser 155.1.97.56`, motor reportado `Chrome/155.0.8059.40`. **17 casos aprobados, 0 fallidos en la ejecución final.**
- Jerarquía/textos/orden exactos, siete SVG, diez destinos institucionales, seis opciones pendientes no navegables; submenús independientes y Enter/Espacio/Tab; navegación de familias y resaltado sin duplicaciones; visibilidad de los cinco roles; configuración heredada y bitácora; ancho colapsado/expandido, hover y foco; ausencia de excepciones JavaScript.
- Diez combinaciones de **320, 375, 768, 1024 y 1440px × claro/oscuro**, altura 900px: ausencia de scroll horizontal del documento/sidebar, scroll vertical propio y fondos del tema. En móvil: foco inicial, ciclo de teclado, Escape, restauración de scroll/foco e `inert`; prueba adicional del backdrop, Tab por todos los controles y cierre al navegar.
- Veinte capturas (parte superior/inferior de cada combinación). Revisión visual directa de 320 claro/oscuro, 375 claro, 768 oscuro, 1024 claro, 1440 oscuro y parte inferior de 320 claro: sin recortes ni cambio del lenguaje PRO; títulos largos se ajustan a dos líneas.
- Evidencia local, no versionada: `C:\Users\calde\AppData\Local\Temp\opencode\sidebar-institutional-qa\results.json` y PNG; script `C:\Users\calde\AppData\Local\Temp\opencode\sidebar-institutional-qa.cjs`. Ejecución: `node <script>` con Vite frontend en `127.0.0.1:5186`. El script utiliza perfil/CDP dedicados; comprobar que sus puertos estén libres antes de repetirlo.
- Solicitudes API y externas bloqueadas mediante CDP; no se inició backend ni se accedió a PostgreSQL, no se crearon datos de ejemplo. Las rutas de familias se comprobaron como navegación, no como integración GET/POST. El aviso «Servidor no disponible» en capturas es esperado por ese aislamiento.

Las primeras ejecuciones sirvieron para corregir el arnés CDP (clics separados por render, alcance local de variables, envío de Enter y comparación de colores OKLCH), no produjeron correcciones adicionales en archivos de aplicación. La ejecución final incluye los 17 casos completos. Limitaciones: sin certificación multinavegador, lector de pantalla, dispositivos físicos ni repetición de N01; la evidencia temporal depende de esta máquina.

### Ajuste posterior — Visitas técnicas fuera del sidebar

Por solicitud del usuario, se oculta el apartado completo **Visitas técnicas** mediante `sidebarHidden`, ya que lo implementará otro integrante. No se modifican sus rutas, componentes ni permisos; se conserva la configuración de navegación para coordinar su futura visibilidad con el responsable.

La jerarquía visible queda: **Panel principal → Familias → Gestión agrícola → Capacitaciones → Insumos e inventario → Seguimiento y reportes**, sujeta al mismo filtrado por roles. Agenda de visitas, Registrar visita e Historial de visitas ya no aparecen en el sidebar. Administración continúa excluida y Auditoría conserva su navegación heredada.

La evidencia de 17 casos y las capturas anteriores corresponden a la versión con Visitas técnicas visible; no validan este ajuste posterior. Para este ajuste se ejecutan build, lint y `git diff --check`, sin repetir las pruebas en navegador.

### Ajuste posterior — Retiro de la ruta de visitas

Por autorización posterior del usuario, se elimina también la ruta frontend `/actividades/visitas` de `apps/web/src/app/routes.tsx` y se retira completamente la configuración de Visitas técnicas y sus subopciones de `navigation.tsx`, en lugar de mantenerla oculta. Era la única ruta de visitas registrada; Registrar visita e Historial de visitas no tenían rutas. El compañero responsable implementará el módulo y sus destinos.

Este ajuste sustituye la decisión anterior de conservar esa ruta/configuración. `/actividades`, `/actividades/asistencia-tecnica` y `/actividades/capacitaciones` permanecen intactas por ser rutas compartidas o de otras funciones. No se modifican backend, componentes funcionales, autenticación, Administración ni Auditoría. Se verifican build, lint, `git diff --check` y ausencia de referencias a la ruta retirada en `apps/web/src`; sin nuevas pruebas de navegador.
