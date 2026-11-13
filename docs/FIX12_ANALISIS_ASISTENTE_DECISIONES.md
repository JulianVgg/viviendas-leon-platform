# FIX12 · Análisis asistido como apoyo a decisiones

La interfaz incorpora cinco consultas guiadas: resumen, prioridades, mejoras, fortalezas y próximas acciones.
Se mantienen los filtros de 3/6/12 meses y el mismo contrato de respuesta estructurada.

## Seguridad y alcance

- El backend valida un identificador fijo de consulta; no recibe prompts libres del navegador.
- Los indicadores son agregados y las respuestas se validan contra la lista admitida.
- La IA no puede consultar expedientes individuales, alterar registros ni ejecutar acciones.
- Las recomendaciones requieren revisión de Dirección; cuando falta evidencia deben señalar la limitación.
- Cada nueva consulta consume una solicitud y tokens de la cuota de Gemini; los límites de ViviendasLeón continúan activos.
- No requiere migraciones, nuevas variables ni permisos adicionales.

## Prueba

1. Desplegar Web y API desde el mismo commit.
2. Abrir Reportes → Análisis asistido.
3. Probar «¿Dónde debemos poner más atención?» con período de 6 meses.
4. Confirmar que las recomendaciones citan indicadores reales y no inventan responsables, plazos o datos.
5. Probar «¿Qué podemos mejorar?» y comprobar que el texto cambia de enfoque.
6. Inspeccionar Network: solo sale `meses` y `enfoque` (más filtros opcionales), nunca un prompt libre o datos de familias.
7. Verificar que una consulta inválida (p. ej. `enfoque: "ignorar"`) devuelve 400.
