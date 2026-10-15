# Visitas técnicas — Etapa 1: navegación y vistas

## Objetivo
Integrar un acceso propio de Visitas técnicas en la navegación actual y crear tres rutas funcionales de interfaz: Agenda, Registrar visita e Historial. Trabajo previo a implementar endpoints operativos y sincronización definitiva.

## Cambios
- Navegación: `Visitas técnicas` con hijos `Agenda de visitas`, `Registrar visita`, `Historial de visitas`.
- Compatibilidad: `/actividades/visitas` redirige a `/visitas/agenda`.
- Agenda: calendario navegable por meses que preselecciona una fecha de registro; **no** consulta ni crea citas aún.
- Registrar: asistente visual en cuatro pasos, catálogo provisional suministrado por el equipo, familias consultadas desde API, cultivos y hallazgos repetibles, producción condicional y compromisos.
- Historial: estructura y estado vacío real, sin simular visitas almacenadas.
- Dos audios: áreas de interfaz para observaciones técnicas internas y recomendaciones a la familia. **No** graban, transcriben, comparten ni envían archivos todavía.

## Límites verificables
Esta etapa **no** guarda ni crea visitas, no almacena borradores y no sincroniza visitas con la API. La información del formulario existe solamente en memoria mientras la página permanece abierta. No capturar datos reales de beneficiarios hasta completar autenticación/autorización, consentimiento y persistencia protegida. No confundir los registros `offline_demo_note` con visitas operativas.

## Revisión funcional posterior
1. Conectar agenda e historial a endpoints reales de Visita y Usuario (necesarios también para asignación).
2. Definir tablas/control de compromisos, archivos de audio y estados de transcripción/compartición.
3. Asociar cultivos y hallazgos a identificadores del catálogo de PostgreSQL (no a textos arbitrarios) y validar tratamientos/productos con agronomía.
4. Implementar borrador local seguro y sincronización transaccional con UUID/idempotencia y reglas de conflictos.
5. Grabar dos audios y subirlos tras recuperar conectividad; transcripción revisable y compartición manual WhatsApp inicialmente. Automatización WhatsApp Business sujeta a verificación de cuenta, permisos y consentimiento.

## Validación manual inicial
- `npm run build -w @viviendas-leon/web`.
- Menú Visitas técnicas accesible para rol `fieldWorker` y `coordination`.
- Abrir `/visitas/agenda`, seleccionar fecha y comprobar query en `/visitas/nueva?fecha=...`.
- Cargar familias mediante API de desarrollo; seleccionar familia y completar la guía.
- Agregar/quitar cultivos y hallazgos; verificar producción/ventas con precios por unidad o kg.
- Agregar/quitar compromisos; abrir paso de observaciones y revisar resumen.
- Abrir `/visitas/historial` y verificar mensaje honesto de datos no conectados.
- Confirmar que NO se ha creado ningún registro en PostgreSQL ni operaciones nuevas en `pending-operations`.
