# FIX23 — Libro auxiliar de bancos

Esta actualización es **incremental sobre FIX22** y modifica solamente **Bancos**.

## Captura

- **Beneficiario** ahora es obligatorio al registrar ingresos o egresos en Bancos (no afecta los movimientos antiguos ni los formularios de otros fondos).
- **Descripción** es un área multilínea, ampliable. Las filas del historial ya no recortan las descripciones largas.

## Descargar el Libro auxiliar

1. Abrir **Control financiero → Bancos** con el rol **Contador**.
2. Seleccionar la cuenta y el mes.
3. Registrar movimientos reales con fecha, documento, beneficiario, descripción, categoría e importe.
4. Descargar **Excel** o **PDF** desde **Movimientos**.

Ambos archivos respetan los campos y la estructura de la plantilla institucional: logotipo, cuenta, número, mes, moneda, saldo inicial, ocho columnas, totales y espacios para las firmas y fecha de revisión. Excel ofrece al menos 30 renglones y calcula saldos con fórmulas. PDF da prioridad a no cortar descripciones: puede reducir renglones vacíos o continuar a otra página cuando sea necesario.

**Datos privados:** los nombres, documentos y movimientos del PDF usado como referencia NO se incluyen en el código ni se importan. Solo se reutiliza el logotipo institucional. El contenido proviene de las operaciones guardadas en PostgreSQL. Las firmas permanecen en blanco.

## Pruebas

- Ingresar una cuenta y registrar un abono y un egreso con beneficiario.
- Escribir una descripción de varios renglones; comprobar que se lee completa en pantalla y en ambos archivos.
- Comprobar que los saldos acumulados y los totales de ingreso/egreso coinciden.
- Descargar un mes vacío y comprobar encabezados y filas de la plantilla.
- Descargar un mes con más de 30 movimientos y verificar la continuación sin pérdida de registros.
- Confirmar que los movimientos anulados no alteran saldos y no aparecen como activos.

No incluye migraciones de PostgreSQL.
