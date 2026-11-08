# Reportes — consulta y exportación operativa

La pantalla **Reportes → Reportes** es una vista de indicadores del período, no una bandeja de aprobaciones.

- El período inicial es el último semestre **completado**; el usuario puede cambiar año y semestre.
- También puede cambiar a **Rango de fechas**, con ambas fechas inclusivas (máximo 731 días).
- Comunidad y familia son filtros opcionales que aplican de igual forma a las gráficas y la exportación.
- Las tarjetas de cosechas, kilogramos y ventas enlazan a módulos con permiso de acceso.
- Las gráficas reproducen únicamente cosechas y ventas reales válidas: kilogramos por mes, ventas por mes separadas por moneda, cultivos con mayor producción y participación por cultivo.
- El detalle por cultivo y la conciliación siguen disponibles en el Excel de **dos hojas**.
- **Coordinación** emite el Excel; Dirección y otros usuarios con permiso de Reportes pueden consultar indicadores.
- No hay estado de validación ni aprobación en la vista o en el Excel. Se conservan los modelos históricos CIR-15 en base de datos para evitar una migración destructiva, pero sus endpoints de cambio de estado ya no se exponen.
- Si faltan datos reales, los gráficos muestran un estado vacío, no valores de prueba.

## Comprobación

1. Verificar semestre 2026-1 y 2026-2, y rango desde 2026-04-15 hasta 2026-05-22.
2. Comparar las tarjetas y gráficas con el consolidado de PostgreSQL.
3. Verificar que un usuario con rol Coordinación pueda exportar y que un rol sin ese permiso reciba 403 en el endpoint de descarga.
4. Abrir el XLSX personalizado: deben existir las hojas Producciones agrícolas y Detalle de registros; el encabezado debe mostrar el rango real y no aparecer «Pendiente de validación».
