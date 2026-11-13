# FIX15 — Estabilidad de Análisis asistido

## Alcance

Parche incremental para la versión compartida el 13 de noviembre de 2026. **Solo** toca el backend de IA y añade pruebas. No modifica interfaces, roles, sesiones, datos de familias ni esquema PostgreSQL.

- Se añade al JSON Schema enviado a Gemini el máximo de elementos y el catálogo exacto de referencias permitidas. Los límites de caracteres se explican en las descripciones del esquema; el servidor sigue verificándolos.
- Tanto informes como chat hacen **un único reintento** para respuestas mal formadas o incompletas por longitud, y para fallos de red o HTTP 408, 500, 502, 503 y 504. No reintentan automáticamente HTTP 400, 401, 403, 404 ni 429, ni rechazos por seguridad.
- El backend registra únicamente categorías fijas de fallos de validación y códigos HTTP; no guarda las preguntas, las respuestas, las claves ni los indicadores en los logs.
- Las solicitudes `FALLIDA` dejan de descontarse de la cuota diaria de **análisis completados**. Las `RESERVADA` siguen descontándose mientras están en curso. Para evitar uso abusivo, se limitan los intentos totales (incluidos los fallidos) por usuario y globalmente en una ventana de 15 minutos. Esto puede producir `AI_RATE_LIMIT` (429), independientemente de la cuota diaria.
- El proveedor puede contabilizar **hasta dos llamadas** por una solicitud de la interfaz cuando se activa el reintento. Sus límites gratuitos son independientes de los nuestros.

## Aplicación en Git Bash / PowerShell

Desde la raíz del repositorio:

```bash
git apply --check --ignore-space-change ViviendasLeon_FIX15_estabilidad_gemini_20261113.patch
git apply --ignore-space-change ViviendasLeon_FIX15_estabilidad_gemini_20261113.patch
cd apps/api
npx prisma generate --config prisma7.config.ts
cd ../..
npm run build
node --test apps/api/tests/fix10-gemini.test.mjs apps/api/tests/fix12-analysis-focus.test.mjs apps/api/tests/fix13-chat-institucional.test.mjs apps/api/tests/fix15-estabilidad-ia.test.mjs
```

El backend ya debe haber compilado antes de ejecutar las pruebas porque estas importan `apps/api/dist`. No se requieren migraciones ni variables nuevas de Railway. Mantener `AI_PROVIDER=gemini`, `GEMINI_API_KEY` y el modelo que ya estaba funcionando.

## Pruebas en Railway

1. Desplegar el commit de FIX15 en **API**; comprobar el SHA realmente desplegado.
2. Con la cuenta autorizada, ejecutar un análisis y una conversación breve. Confirmar formato y referencias reales.
3. Repetir una vez; ante fallos, buscar en logs de **API** las etiquetas `[IA/Gemini]` o `[IA/Chat]` (solo categorías y estados, sin datos sensibles).
4. Verificar que `AI_INVALID_RESPONSE` siga rechazando referencias inexistentes si fallan ambos intentos. No se entregará una respuesta inventada para evitar el error.
5. Si se alcanza `AI_RATE_LIMIT`, esperar el vencimiento de la ventana de 15 minutos; si se alcanza `AI_LIMIT`, revisar la cuota del proveedor en Google AI Studio.

Una compilación local correcta y las pruebas simuladas no equivalen a haber comprobado la API de Google con la clave real ni la base de Railway.
