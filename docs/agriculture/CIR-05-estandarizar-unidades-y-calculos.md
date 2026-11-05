# CIR-05 — Cantidades, unidades y cálculos agrícolas

## Alcance

- **Plantas iniciales / observadas:** conteos del ciclo o evaluación técnica; no son unidades cosechadas ni deben multiplicarse otra vez al registrar una cosecha real.
- **Kilogramos (kg):** cantidades positivas con hasta tres decimales, almacenadas en `DetalleProduccion.cantidadTotal` como `Decimal`.
- **Unidades cosechadas:** piezas/ejemplares completos; registro entero positivo.
- **Manojos:** paquetes contados, también enteros positivos. Su tamaño no está estandarizado en los documentos proporcionados.
- **Litros y demás unidades:** no se ofrecen para nuevas cosechas. Pueden seguir existiendo para insumos u otros módulos.

Los datos faltantes no se sustituyen por `0`; el formulario exige una unidad y una cantidad, y el Dashboard señala registros inválidos que encuentre en datos anteriores. Un período sin cosechas sí tiene total cero. Los resúmenes separan kg, unidades y manojos, sin convertir una unidad a otra.

## Catálogo de unidades en PostgreSQL

El `seed` del desarrollo contiene unidades con prefijo `SYN-` para pruebas. **Nunca se eliminan ni renombran**, ya que pueden estar referenciadas por cosechas antiguas.

Antes de utilizar el registro de producción en operación real, instalar o comprobar las unidades institucionales con el script **de simulación por defecto**:

```powershell
cd apps/api
node scripts/cir-05-importar-unidades.mjs
```

Solo después de revisar la simulación y verificar un respaldo:

```powershell
node scripts/cir-05-importar-unidades.mjs --aplicar --respaldo-confirmado --confirmar CODIGO_REAL --usuario-correo CORREO_AUTORIZADO
```

La segunda simulación debe mostrar tres unidades existentes y cero pendientes de crear o revisar. Para revisar el inventario completo y detectar conteos históricos fraccionarios o no positivos, ejecuta `node scripts/cir-05-auditar-unidades.mjs` (solo lectura). Se respetan las unidades reales equivalentes ya existentes; si aparecen duplicadas o inactivas el script bloquea la escritura para revisión humana.

Los selectores de nueva producción excluyen las unidades `SYN-`, inactivas e incompatibles. Los registros históricos continúan consultables con sus unidades originales.

## Conversión y producción por planta

- **No existe conversión universal** entre `kg`, `unidad` y `manojo`. Las conversiones requerirán equivalencias aprobadas y documentadas por cultivo, fecha y presentación; no se infieren.
- Los valores `perPlantKg` y `perPlantUnits` de visitas son **estimaciones**, no producción registrada ni ingresos efectivos.
- Los precios de visita generan solo una **valorización estimada**, nunca una venta confirmada. El módulo de ventas e informes gestionará su distinción (CIR-09 a CIR-13).
- La producción por planta **real** de un semestre solo puede calcularse cuando se conoce la cantidad verificable de plantas productivas y la producción cosechada de la unidad elegida. Si falta alguno, el resultado se presenta como *sin dato*, nunca como cero.
- Redondeo: kg hasta tres decimales en cosechas; valores monetarios estimados de visita hasta dos decimales. El reporte institucional definirá sus reglas definitivas junto con Coordinación.

## Pruebas y decisiones pendientes

Probar: conteos enteros, kg decimal, valores negativos o vacíos, unidad inactiva, unidad sintética, unidad de insumo, indicadores separados, historial con datos sintéticos y ausencia de estimaciones convertidas en cosechas reales.

**Pendiente de confirmación con ViviendasLeón:** medida estándar de un manojo por especie, precio y unidad comercial utilizada para cada cultivo, y definición de plantas productivas por período. No se convierten automáticamente.
