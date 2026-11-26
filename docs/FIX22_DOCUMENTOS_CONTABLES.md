# FIX22 — Formatos contables y anulación

## Alcance

- Conserva las cuentas, movimientos, comprobantes, categorías y permisos del módulo FIN-01/FIX20 y la asignación del rol **Contador** de FIX21.
- Sustituye la ventana nativa `window.prompt` de anulación por el diálogo accesible de TailAdmin. Exige un motivo de hasta 300 caracteres; una anulación no borra el movimiento y se registra en auditoría.
- Añade descargas **PDF y Excel** para los cuatro formatos institucionales. Las plantillas siguen la estructura, no los importes ni nombres personales, de los documentos de referencia entregados por la organización.
- No añade dependencias nuevas ni migraciones PostgreSQL.

## Antes de crear los documentos

1. Iniciar sesión con el usuario al que se asignó el rol **Contador** (FIX21); la cuenta con rol **Auditor** no puede registrar movimientos. Cerrar y volver a iniciar sesión tras cambios de roles.
2. En **Control financiero → Bancos**, crear una cuenta con nombre, referencia parcial, fecha de apertura y saldo inicial real del período. Registrar ingresos y egresos con fecha, documento (N/D, N/C, cheque o transferencia), beneficiario, categoría, importe y descripción.
3. En **Caja chica**, crear un fondo, informar el saldo inicial y registrar reposiciones como **Ingreso** y gastos como **Egreso**, siempre con la categoría correcta.
4. En **Fondos médicos**, crear el fondo (saldo inicial de la cuenta principal en cero), agregar las subcuentas de las personas autorizadas con su saldo inicial, y asignar cada abono/gasto a su subcuenta.
5. Para movimientos internos, usar **Transferencia interna**, no dos ingresos/egresos manuales. Las dos caras del traslado se reflejan en los libros de cuenta, pero quedan excluidas del resumen de ingresos externos del informe mensual.
6. Adjuntar los comprobantes PDF/JPG/PNG correspondientes a los movimientos.

## Cómo generar los cuatro formatos

| Pantalla | Elegir | Botones | Documento resultante |
|---|---|---|---|
| Bancos | Cuenta y mes | Excel / PDF | Libro auxiliar de bancos: cuenta, referencia, saldo inicial, fecha, documento, beneficiario, movimiento, ingresos, egresos, saldo acumulado y firmas en blanco. |
| Caja chica | Fondo y mes | Excel / PDF | Liquidación de caja chica: saldo inicial, fecha, descripción, debe, haber, saldo, totales y desglose por categoría. |
| Fondos médicos | Fondo y mes | Excel / PDF | Control de cuenta médica: saldos por persona, movimientos por subcuenta, totales del fondo. Los datos personales solo aparecen si ya se registraron en el sistema. |
| Informe mensual | Mes | Excel / PDF | Informe financiero preliminar: ingresos y egresos externos, resultado, ejecución por rubro y espacios de firma. |

**Aclaración:** El formato de informe mensual original tiene presupuesto, ejecutado y porcentaje de ejecución. La fase FIN-01 aún no dispone de partidas presupuestarias; esos campos aparecen como **«Sin registrar»** y no se inventan porcentajes. La comparación presupuestaria completa sigue siendo una mejora futura.

## Comprobaciones en localhost

1. Ejecutar `npm run build` y `npm run dev` con PostgreSQL local iniciado.
2. Iniciar sesión como Contador y comprobar que aparecen los botones para crear cuenta y movimientos.
3. Registrar en un fondo de pruebas, por ejemplo, Q1,000.00 iniciales, Q250.00 de ingreso y Q125.50 de gasto; el saldo debe ser Q1,124.50.
4. Exportar Excel y PDF para el mes de los registros. Confirmar las fechas y el mismo saldo en ambas descargas.
5. Anular un gasto usando el nuevo diálogo, indicando un motivo. Comprobar que el gasto siga en el historial y que ya no se cuente en los saldos ni las nuevas exportaciones.
6. En fondos médicos, registrar dos subcuentas: los movimientos de una no deben modificar el saldo de la otra.
7. Hacer una transferencia Banco → Caja chica y comprobar que aparezca en ambos libros, pero **no** en los ingresos externos del Informe mensual.
8. Descargar Informe mensual en PDF y Excel. Confirmar que las categorías coincidan con los gastos registrados y que no muestre porcentajes presupuestarios inventados.
9. Iniciar sesión como Auditor para verificar que puede consultar y exportar, pero no crear ni anular.
10. Abrir la vista en teléfono: los botones de exportación deben ser accesibles y el diálogo de anulación debe caber en pantalla.

## Observaciones de seguridad

- Los documentos se generan a partir de los registros de la cuenta y período autorizados; las exportaciones no incluyen datos del PDF original ni ejemplos pregrabados.
- Mantener las descargas en un dispositivo institucional seguro: los archivos exportados quedan fuera del control de acceso de la aplicación.
- No se reproducen firmas manuscritas. Se dejan espacios para firmas presenciales cuando corresponda.
- Si un período registra más de 5,000 movimientos por cuenta, el servidor rechaza la exportación en lugar de producir un documento truncado.
