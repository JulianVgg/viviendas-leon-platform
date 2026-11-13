# FIX17 — Esquema compatible de Gemini

## Problema

La API de Google devolvía `HTTP 400 (INVALID_ARGUMENT)` repetidamente después de FIX15. El cambio introdujo esquemas estructurados con varios `maxItems`, `minItems` y enumeraciones extensas repetidas en cada referencia de indicador. Google advierte que los esquemas JSON de gran complejidad pueden generar errores 400. Se han reportado incompatibilidades específicas con `maxItems` en Gemini 3.5 Flash-Lite.

## Solución

- El adaptador de Gemini usa un esquema JSON **simple** (sin límites de array ni enums redundantes), el mismo formato que funcionaba antes de FIX15.
- Se mantienen intactos `validarResultadoAnalisisIA` y `validarRespuestaChat`: el servidor sigue rechazando referencias inventadas, campos adicionales y cantidades excesivas.
- Se conservan los reintentos acotados y el diagnóstico seguro de FIX15.
- No se cambia la clave, el modelo, la cuota, PostgreSQL ni la interfaz.

## Verificación

Aplicar el parche sobre FIX15. Ejecutar desde la raíz:

```powershell
cd apps/api
npx prisma generate --config prisma7.config.ts
cd ../..
npm run build
node --test apps/api/tests/fix15-estabilidad-ia.test.mjs
```

Integrar la rama en `main` y comprobar que **API** se haya desplegado con el nuevo commit. Generar un informe y una respuesta de chat. Si Google responde de nuevo con `HTTP 400`, registrar solo el código/estado seguro del proveedor e investigar el `error.details` de Google sin compartir tokens ni indicadores personales.

La corrección elimina una causa conocida de `INVALID_ARGUMENT`, pero requiere una prueba real con la clave del proyecto para confirmar el resultado.
