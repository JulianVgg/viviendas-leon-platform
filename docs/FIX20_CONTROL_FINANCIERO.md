# FIX20 — Control financiero operativo (primera etapa)

## Alcance

Menú independiente **Control financiero** con **Bancos**, **Caja chica**, **Fondos médicos** e **Informe mensual**. Usa el diseño del proyecto. No modifica el módulo de ventas agrícolas ni importa los PDF recibidos como datos institucionales.

- Bancos y caja chica: crea cuentas/fondos con saldos iniciales; registra ingresos y egresos por fecha, categoría, referencia y descripción; calcula saldos y exporta Excel por mes.
- Fondos médicos: crea fondo y subcuentas identificadas por nombre, cada una con saldo separado; registra abonos/gastos y exporta movimientos. Los datos médicos son sensibles y no se envían a Gemini.
- Transferencias internas: registra simultáneamente egreso e ingreso entre cuentas en una transacción PostgreSQL. Estas operaciones se excluyen de los totales de ingresos/egresos externos del informe mensual.
- Comprobantes: un archivo PDF/JPEG/PNG de hasta 5 MB por movimiento, almacenado en PostgreSQL y descargado solo a través de rutas autenticadas. No se generan URLs públicas.
- Anulaciones: no se elimina el movimiento. Se registra responsable, fecha y motivo en la misma base de datos y en Bitácora. Para las transferencias se anulan ambas partes.
- Informe mensual: resumen **preliminar** por cuenta y categoría con Excel (Resumen, Categorías y Movimientos). No incluye todavía presupuesto vs. ejecutado, conciliación bancaria ni flujo de aprobación. La automatización presupuestaria se desarrollará en la siguiente etapa.

## Permisos

- **Contadora interna**: lectura y registro/anulación de movimientos autorizados.
- **Auditor**: consulta, saldos y exportación, sin escritura por defecto.
- **Dirección general**: acceso por el privilegio institucional existente, **sin paso obligatorio de aprobación**.
- Los permisos se comprueban en la API, no solo al mostrar botones. Los movimientos anulados conservan trazabilidad.

Si una cuenta de prueba usa un rol diferente, comprueba sus permisos desde Administración → Roles y permisos. No se crean usuarios ni contraseñas en esta migración.

## Aplicar en `fix-auditor`

Antes de aplicar, guarda cualquier cambio local pendiente y realiza copia de seguridad de PostgreSQL. **Usa solo un parche**: el paquete `post_FIX18_FIX19` si ya tienes ambos cambios; si el código corresponde exactamente al ZIP del 20 de noviembre anterior a esos arreglos, usa la versión base. Compruébalo siempre primero con `git apply --check`.

```powershell
# En la raíz del repositorio:
git status
git apply --check --ignore-space-change ViviendasLeon_FIX20_control_financiero_post_FIX18_FIX19_20261120.patch
git apply --ignore-space-change ViviendasLeon_FIX20_control_financiero_post_FIX18_FIX19_20261120.patch

cd apps/api
npx prisma migrate deploy --config prisma7.config.ts
npx prisma generate --config prisma7.config.ts
npx prisma migrate status --config prisma7.config.ts
cd ../..
npm run build
```

El comando de migración solo afecta la `DATABASE_URL` configurada en ese entorno. Asegura que el primer despliegue de la **API** aplique la migración en Railway antes de utilizar las nuevas pantallas. **No uses `prisma migrate reset` en producción.**

## Pruebas recomendadas (cuentas de prueba y montos ficticios)

1. Con **Contadora interna**, abre los cuatro submódulos. Confirma que Auditor no pueda crear ni anular movimientos. El Técnico no debe poder acceder.
2. Crea una cuenta de banco y una caja chica con saldos de prueba. Crea un fondo médico y dos subcuentas distintas.
3. Registra ingreso y egreso en un mismo mes. Verifica que saldo inicial + ingresos - egresos coincida con el saldo mostrado.
4. Registra un gasto en una subcuenta médica; comprueba que su saldo cambie sin modificar el de la otra.
5. Realiza una transferencia de banco a caja chica. Aparecerán dos movimientos, pero el resultado mensual externo **no** debe aumentar por ese traslado.
6. Adjunta un comprobante de prueba y descárgalo. Confirma que una persona sin permiso recibe 403.
7. Anula un movimiento y comprueba que sigue apareciendo marcado como anulado, deja de afectar el saldo y aparece en Bitácora.
8. Exporta el libro mensual de cada cuenta; exporta el informe mensual y comprueba las tres hojas. Verifica que no se mezclen meses.
9. Comprueba diseño móvil y que no se hayan perdido las funciones de Reportes, Familias y Visitas.
10. Prueba también que la pantalla muestre un error claro cuando la conexión esté caída. La contabilidad **no** funciona offline en esta etapa; no intentes guardar movimientos sin conexión.

## Precauciones

- No importes automáticamente los importes de los PDF: son documentos de referencia y requieren conciliación manual.
- Las cuentas bancarias pueden identificarse por nombre y **últimos dígitos**, sin guardar números completos si no son necesarios.
- Evita duplicar transferencias manualmente como nuevas entradas y salidas externas. Utiliza el formulario **Transferencia interna**.
- Esta etapa registra solo importes en **quetzales**; la contabilización multimoneda y el presupuesto vs. ejecutado corresponden al siguiente desarrollo.
- No cargues los documentos médicos en el análisis asistido. Limita el acceso real mediante usuarios individuales, permisos y respaldos protegidos.
- El desarrollo y pruebas unitarias no equivalen a una conciliación bancaria: valida saldos con la persona encargada antes de utilizar datos reales.
