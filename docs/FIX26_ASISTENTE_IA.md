# FIX26 — Asistente IA

## Instalación
- Este cambio se aplica sobre la versión que ya tiene el FIX de agenda, IA, dashboard contable y reprogramaciones del 26 de noviembre. Existe además una variante acumulativa para el ZIP original; no aplicar ambas.
- API: ejecutar `npx prisma migrate deploy --config prisma7.config.ts` y `npx prisma generate --config prisma7.config.ts` desde `apps/api`, usando el `DATABASE_URL` del entorno que se pretende actualizar. La migración agrega `ia_conversacion` y no altera registros existentes.
- Railway: aplicar la misma migración al PostgreSQL remoto desde el entorno de API antes de servir la nueva versión. No pegar secretos en el código ni en Git.
- Variables: `AI_PROVIDER=gemini`, `GEMINI_ANALYSIS_MODEL=gemini-3.5-flash-lite`, `AI_DAILY_USER_LIMIT=20`, `AI_DAILY_GLOBAL_LIMIT=60`. Conservar `GEMINI_API_KEY`. Los límites son valores configurables, no garantizan el cupo del proveedor externo.

## Alcance y seguridad
- Chat libre para Dirección/Coordinación; conserva hasta los 100 intercambios más recientes por conversación y muestra las últimas 100 conversaciones por usuario. Cada consulta utiliza hasta 20 intercambios completos y 120 000 caracteres de historial, además del contexto institucional de hasta 100 000 bytes. El usuario puede recuperar o eliminar conversaciones.
- Pregunta de 4 000 caracteres; respuesta de 8 000 caracteres, con presupuesto de salida 8 192 tokens. Las consultas rápidas usan el chat. El generador estructurado de indicadores existente continúa separado, con la misma cuota.
- Catálogo operativo: hasta 100 registros por módulo, identificadores internos, estados y fechas; finanzas solo en agregados para las cuentas cuyo tipo está autorizado. El catálogo nominativo se utiliza únicamente en el navegador; insertar una referencia incorpora un ID en el prompt, no el nombre. La pregunta libre y su historial sí se transmiten a Gemini. No introducir información personal o confidencial. No se habilitó navegación web, lectura de documentos, SQL ni escrituras financieras.
- Las propuestas del modelo son datos no confiables: lista cerrada, validación de IDs y fechas, permisos, confirmación explícita y llamada a la ruta existente o especializada. El modelo no ejecuta nada. Las propuestas no se restauran con el historial, evitando su reejecución accidental.
- Agendar visita técnica: reutiliza transacción de `/visitas/sync`, requiere supervisor, técnico activo con permiso de escritura y familia activa. Conserva el ciclo semanal existente, bloqueo y avisos; la cita técnica utiliza turno mañana/tarde. Los eventos institucionales usan horas específicas y asignaciones obligatorias del FIX previo. Los compromisos solo pueden cambiarse por el propietario autorizado; no se amplían los permisos de otros usuarios.
- Las escrituras operativas conservan la auditoría HTTP central; esta sigue siendo asíncrona según el diseño existente. Las claves de API no se incluyen en este patch.

## Pruebas manuales
1. Dirección inicia una conversación, consulta un tema general y repregunta por una parte de la respuesta; verifica el contador, recarga y reabre el historial. Crea otra conversación y vuelve a la anterior. Eliminar una conversación solo afecta al propio usuario.
2. Dirección selecciona una familia activa y un técnico desde el catálogo del asistente e indica una fecha futura y turno. Confirma la propuesta. Verifica agenda, próxima visita semanal si corresponde, notificación al técnico y bitácora. Repite con una familia que tiene una cita pendiente en el mismo ciclo para comprobar rechazo de duplicados.
3. Solicita reprogramar una visita con motivo. Cancela primero y comprueba que no cambió; vuelve a solicitar y confirma. Comprueba fecha, historial y notificación. Las solicitudes jerárquicas de actividades institucionales se prueban aparte como en el FIX previo.
4. Solicita un reporte semestral de año y semestre concretos y confirma la descarga Excel. Verifica permisos de exportación. Para compromisos, prueba un compromiso propio y uno ajeno; el ajeno no se puede actualizar.
5. Coordinación consulta datos financieros sin permiso financiero: no debe recibirlos. Contador y técnico no deben abrir la API del asistente ni conversaciones de otro usuario. Prueba una URL con UUID de otra cuenta y comprueba que devuelve 404.
6. Prueba un error de cuota del proveedor: no debe registrarse una acción ni mostrar una respuesta inventada. El contador de plataforma comparte análisis y chat y reinicia a medianoche de Guatemala.

## Validación automatizada
Desde la raíz: `npm run build -w @viviendas-leon/api` y `node --test apps/api/tests/fix10-gemini.test.mjs apps/api/tests/fix12-analysis-focus.test.mjs apps/api/tests/fix13-chat-institucional.test.mjs apps/api/tests/fix15-estabilidad-ia.test.mjs apps/api/tests/fix26-asistente-agente.test.mjs`. Frontend: `npm run build -w @viviendas-leon/web`.
