# FIX13 — Chat institucional de solo lectura

## Objetivo

Conservar los análisis rápidos de FIX12 y habilitar un campo **Preguntar al asistente** para preguntas libres y repreguntas de Dirección. No requiere migraciones nuevas ni claves diferentes a las ya configuradas para FIX11/FIX12.

## Instalación

Desde la raíz, **después de FIX12**:

```powershell
git apply --check --ignore-space-change ViviendasLeon_FIX13_chat_institucional_seguro_20261112.patch
git apply --ignore-space-change ViviendasLeon_FIX13_chat_institucional_seguro_20261112.patch
cd apps/api
npx prisma generate --config prisma7.config.ts
cd ../..
npm run build
```

Subir a una rama de pruebas, verificar la compilación y desplegar los servicios correspondientes en Railway. No se ejecutan migraciones PostgreSQL adicionales.

## Funcionamiento

- Conserva informes predefinidos y agrega un chat libre en **Reportes → Análisis asistido**.
- Preguntas limitadas a 600 caracteres; el servidor valida el historial y recibe como máximo cuatro intercambios anteriores (ocho mensajes).
- El contexto proviene de los indicadores consolidados MON-01 a MON-06 autorizados para Dirección; nunca se entregan expedientes, fotos, teléfonos, contraseñas ni SQL a Gemini.
- Respuestas JSON validadas; referencias solo a los indicadores de la lista blanca, sin HTML ni ejecución de acciones.
- El historial se mantiene **solo en memoria de la pantalla actual**, no en PostgreSQL ni en almacenamiento del teléfono. Cambiar el período, salir de la vista o pulsar «Nueva conversación» lo reinicia.
- Las consultas de chat comparten los **mismos límites diarios** de Análisis asistido (por defecto 3 por usuario, 30 globales; Railway puede haberlos cambiado con `AI_DAILY_USER_LIMIT` y `AI_DAILY_GLOBAL_LIMIT`). Como antes, los intentos fallidos también consumen el cupo interno de prevención de abuso.
- La respuesta puede decir que no dispone de datos para preguntas individuales o para métricas que aún no se consolidan en MON-01 a MON-06.

## Prueba recomendada

1. Entrar con Dirección y generar un análisis rápido de seis meses; confirmar que sigue funcionando.
2. Preguntar «¿Qué indicadores necesitan más atención?» y verificar referencias a datos reales.
3. Continuar «¿Qué harías primero?» y confirmar que el chat utiliza la pregunta anterior como contexto.
4. Preguntar por el teléfono o los datos personales de una familia y confirmar que indica la limitación, sin dar información privada.
5. Cambiar de seis a tres meses y confirmar que el chat se reinicia para no mezclar períodos.
6. Pulsar «Nueva conversación» y confirmar que se borra el historial de esa pantalla.
7. Repetir hasta el límite diario: debe aparecer un aviso, sin bloquear visitas, familias o reportes.
8. Revisar permisos: un usuario Técnico no debe poder invocar el endpoint `POST /api/v1/dashboard/analisis/chat` (403).
9. Verificar en Railway el consumo y comprobar que `AI_PROVIDER=gemini` y la clave están configurados en **API**, nunca en Web.

## Seguridad y facturación

La API utiliza una clave privada del backend y **no concede acceso directo al modelo a PostgreSQL**, ni admite SQL, herramientas de escritura o cambios automáticos. El historial enviado por el cliente se considera contenido no confiable. Las respuestas son recomendaciones para revisión humana.

**En Google AI Studio Free Tier, alcanzar los límites gratuitos no habilita pagos por sí mismo.** Sin cuenta de facturación vinculada, el proveedor deniega solicitudes al alcanzar la cuota. Si se activa un plan pagado explícitamente en Google, pueden generarse cargos: revisa regularmente el nivel de facturación y el panel de uso. Railway factura por separado según el plan.

**Privacidad:** el proveedor del nivel gratuito puede utilizar los datos enviados para mejorar sus servicios. No escribas datos personales, nombres, contraseñas ni información confidencial en el chat, aunque las métricas que el servidor adjunta sean agregadas.
