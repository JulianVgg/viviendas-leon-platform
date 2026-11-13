# FIX16 — Cobertura de visitas y reportes

## Cambios

- **Mi calendario → Familias con huerto:** búsqueda por familia o comunidad y filtros **Por gestionar**, **Todas**, **Por agendar**, **Vencidas**, **Agendadas** y **Visitadas**. Se muestran 8 por lote; «Mostrar más» evita listas extensas.
- **Registrar visita técnica → Información general:** mismo listado de cobertura con filtros, búsqueda y botón «Elegir» para seleccionar una familia sin abandonar el formulario. Se conserva el flujo actual de vinculación a citas programadas; las vencidas deben reprogramarse en la agenda.
- La clasificación se calcula por familia (sin duplicar las que tienen varios huertos) y por ciclo móvil de **8 días**. Da prioridad a una visita ya realizada, luego a una cita futura, luego a una cita vencida y, finalmente, a una pendiente de agendar.
- Se guarda localmente el listado de familias con huerto; si falla la conexión, se muestra la última copia disponible. No se recupera la copia si la API devuelve 401/403.
- **Reportes:** nota breve que aclara por qué un importe en GTQ no aparece en USD: los totales se presentan en su moneda original; no hay conversión automática.

## Límites y alcance

No se ha agregado ni inventado un tipo de cambio. Las ventas registradas en quetzales no equivalen a ventas originales en dólares. Si la organización necesita convertir divisas para informes, se requiere elegir una tasa verificable y una fecha de aplicación.

Sin migraciones de PostgreSQL, cambios de permisos ni cambios de API. No se eliminan visitas ni datos existentes.

## Verificación local

Desde la raíz del repositorio, con FIX15 aplicado:

```bash
# Antes de aplicar:
git apply --check ViviendasLeon_FIX16_filtros_cobertura_visitas_reportes_20261113.patch
git apply ViviendasLeon_FIX16_filtros_cobertura_visitas_reportes_20261113.patch

# Verificar frontend:
npm run build -w @viviendas-leon/web

# Prueba de cobertura (Node 22):
node --experimental-strip-types --test apps/web/tests/familyVisitCoverage.test.mjs
```

En móvil: abre Mi calendario y filtra **Por gestionar**; comprueba una familia vencida y otra programada. Después abre Registrar visita técnica y elige una familia desde el nuevo panel; verifica que el selector superior cambie y que las citas programadas sigan apareciendo.
