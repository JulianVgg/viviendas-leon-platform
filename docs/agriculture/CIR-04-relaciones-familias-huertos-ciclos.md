# CIR-04 — Validar relaciones entre familias, huertos y ciclos

Issue: #229. Alcance: integridad y comprobaciones funcionales; **no** se importan huertos o siembras ni se alteran registros existentes.

## Relaciones

- `Familia.id → Huerto.familiaId → CicloCultivo.huertoId → Cultivo.id`.
- Las evaluaciones AGR-04/AGR-06 se asocian mediante `EvaluacionCultivo.cicloCultivoId`, y deben pertenecer a una visita realizada de **la misma familia**.
- Las cosechas formales solo pueden registrarse contra un ciclo existente (`RegistroProduccion.cicloCultivoId`). No equivalen a estimaciones del formulario de visitas.
- Un cultivo del catálogo puede utilizarse en diferentes huertos y en sucesivas siembras. **No** se prohíbe cultivar dos lotes de la misma especie en distintas fechas.

## Reglas reforzadas

1. Para una nueva siembra, deben existir huerto activo y cultivo activo (regla existente).
2. No se admite una siembra de igual huerto, cultivo, fecha de siembra y fecha de trasplante; las inserciones del mismo huerto se serializan con bloqueo de fila. No se modifican duplicados históricos automáticamente.
3. Una nueva evaluación de visita debe apuntar a un ciclo activo de un huerto activo y cultivo activo, de la **misma familia**, con fecha de plantación no posterior a la visita.
4. Se conservan las capturas antiguas por nombre, el comportamiento offline y sus identificadores. No se crean vínculos automáticos sobre datos históricos.
5. Los ciclos finalizados siguen visibles en el historial, pero no pueden seleccionarse para crear evaluaciones nuevas.

## Auditoría local de solo lectura

Desde `apps/api` con PostgreSQL disponible:

```powershell
node scripts/cir-04-auditar-relaciones.mjs --salida private/cir-04/resultado.json
```

Incluye conteos de familias, huertos, ciclos, cosechas, evaluaciones, posibles referencias sin relación, evaluaciones vinculadas a otras familias y siembras exactamente duplicadas. Un registro de familia sin huerto **no se corrige automáticamente**. El resultado es privado y no se incorpora al repositorio.

## Comprobación manual

1. Abrir el expediente de una de las 19 participantes oficiales: mostrar ausencia de huertos sin crear uno ficticio.
2. En una familia de prueba con huerto activo: registrar una siembra con variedad del catálogo oficial, después comprobarla en el expediente y en `Gestión agrícola → Ciclos agrícolas`.
3. Intentar registrar el mismo cultivo en el mismo huerto con idénticas fechas: recibir `409 DUPLICATE_CYCLE`. Usar una fecha diferente: permitir nuevo lote.
4. Durante una visita de la familia, comprobar que el selector ofrece solo los ciclos activos, de huertos activos y ya sembrados. No seleccionar siembras de otras familias.
5. Abrir el seguimiento del ciclo para comprobar las evaluaciones AGR-06; verificar que los datos de los ciclos anteriores no se pierden.
6. Probar registro de cosecha contra un ciclo inexistente: recibir `404 CYCLE_NOT_FOUND` (comportamiento ya existente).
7. Ejecutar las suites de pruebas, `npm run build`, y revisar los resultados de la auditoría de solo lectura.

## Pendientes institucionales

- Los 19 nombres incorporados en CIR-02 no implican que las 19 familias tengan huerto activo.
- La diferencia entre 18 huertos del informe histórico y 19 participantes requiere validación con la ONG.
- El cierre/actualización de estados de ciclos no es parte de este issue; se identifican los estados disponibles para consultas.
- AGR-06 muestra evaluaciones vinculadas al ciclo; no debe confundirse con un historial *unificado* completo de tratamientos y ventas si estos aún no se registran estructuradamente.
