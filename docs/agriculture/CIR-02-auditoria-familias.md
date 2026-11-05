# CIR-02 — Validación del padrón de familias y beneficiarios

Issue: [#227](https://github.com/JulianVgg/viviendas-leon-platform/issues/227).

## Alcance y fuentes

- Fuente: documento institucional entregado por ViviendasLeón, páginas 2–3 (19 participantes, comunidades y ubicaciones), más la tabla de modalidades productivas de la página 2.
- BD: `familia`, `integrante_familia`, `comunidad`, `huerto` en PostgreSQL, **solo lectura**.
- El padrón contiene nombres abreviados y el primer cuadro muestra nombres más extensos; esas diferencias requieren revisión humana, no equivalencias automáticas.
- El informe de producción del documento histórico menciona **18 huertos**. El número no puede equipararse automáticamente a 19 familias ni al número de huertos activos de la BD actual.

## Uso (no requiere migraciones)

1. Ejecutar el patch desde la raíz del repositorio.
2. Guardar **fuera de Git** el CSV institucional en `apps/api/private/cir-02/participantes-oficiales.csv`. La carpeta está protegida por `.gitignore`. No publicar nombres, coordenadas ni informes de auditoría en un repositorio público, PR o capturas.
3. El CSV debe contener exclusivamente estas columnas: `nombre,comunidad`, con **19 registros**, en UTF-8. Los nombres pueden estar abreviados como en la tabla institucional; las abreviaturas producirán alertas de revisión, no emparejamientos definitivos.
4. Configurar `DATABASE_URL` en `apps/api/.env` con acceso a la BD que se desea revisar. Preferir credenciales de solo lectura. No usar los datos sintéticos de `seed.ts` como si fueran el padrón oficial.
5. Desde la raíz del repositorio, ejecutar:

```bash
node --test apps/api/tests/cir-02-audit.test.mjs
cd apps/api
node scripts/cir-02-auditar-familias.mjs --oficial private/cir-02/participantes-oficiales.csv --salida private/cir-02/resultado.md
```

6. Revisar localmente `apps/api/private/cir-02/resultado.md` con Coordinación. El programa utiliza una transacción `REPEATABLE READ READ ONLY`; no ejecuta `INSERT`, `UPDATE`, `DELETE`, seed ni migraciones.

## Interpretación

- `COINCIDENCIA_EXACTA`: coincidencia normalizada de nombre de referencia **o integrante** y comunidad, única entre las familias consultadas. Sigue pendiente de aprobación humana de identidad.
- `REVISAR_NOMBRE`: coincidencia de tokens con nombre más extenso, posible abreviatura. **No** se acepta automáticamente.
- `REVISAR_COMUNIDAD`: nombre exacto encontrado en otra comunidad. Investigar antes de cambiar comunidad.
- `AMBIGUO` / `DUPLICADO_POTENCIAL`: más de una familia posible. No fusionar.
- `SIN_COINCIDENCIA`: no se encontró candidato con las reglas de búsqueda actuales; no demuestra que la persona no exista.
- `COMUNIDAD_NO_CATALOGADA`: comunidad del padrón ausente del catálogo; verificar nomenclatura y municipio.
- `Familias no conciliadas`: incluye datos sintéticos, otras familias y los casos con coincidencias parciales. No constituye una lista de bajas.
- `Familias sin huerto activo`: requiere explicación institucional (huerto no creado, inactivo, otra modalidad o proyecto), **no** implica crear o activar uno automáticamente.

**Limitaciones:** esta auditoría no valida ubicaciones geográficas (CIR-07), modalidades productivas (CIR-08), ni acceso a los datos reales de la BD hasta ejecutarse localmente. No verifica que todos los nombres de la primera tabla del documento coincidan con los de la segunda; la conciliación de identidades requiere validación de la ONG.

## Procedimiento de corrección segura (posterior a la revisión)

1. Guardar una copia de seguridad verificada de la BD antes de cualquier corrección.
2. Para cada hallazgo, confirmar con Coordinación: identificador `familia.id`, nombre oficial, comunidad y relación con huertos; documentar la fuente y la persona que autorizó la decisión.
3. Clasificar como `dato correcto`, `corrección autorizada`, `duplicado confirmado`, `registro sintético` o `pendiente de verificación`. No modificar casos pendientes.
4. Efectuar únicamente correcciones individuales por las interfaces/API existentes y con usuario autorizado; respetar la bitácora y el control de concurrencia. No hacer SQL masivo ni eliminar/mezclar familias automáticamente.
5. Si existe un duplicado confirmado que involucra huertos, visitas, integrantes, capacitaciones o producción, crear un subissue específico de migración de relaciones y auditoría; **no fusionar** desde este script.
6. Volver a ejecutar la auditoría; revisar que las diferencias se resolvieron y que no se perdieron relaciones. Conservar la evidencia privada de antes/después.

## Criterios de aceptación y evidencia

- [x] Existe un procedimiento reproducible de comparación contra el padrón oficial de 19 participantes.
- [x] Se identifican nombres, comunidades, posibles duplicados, familias incompletas y huertos activos/sin huerto activo.
- [x] La auditoría es de solo lectura y no altera registros ni asociaciones.
- [ ] Se ejecutó contra la BD institucional y se revisó el resultado con Coordinación.
- [ ] Todas las diferencias están corregidas o documentadas con responsable/decisión.
- [ ] Se aclaró con la ONG la relación entre 19 participantes y 18 huertos del informe histórico.

**No marcar CIR-02 Done** hasta completar los tres últimos puntos con evidencia institucional, sin adjuntar datos personales al issue público.

## Carga controlada del padrón (segundo patch de CIR-02)

> Este paso es **opcional y con escrituras reales**: la auditoría anterior no importa datos.
> Solo utilizarlo en una base autorizada, tras obtener respaldo, conciliar identidades y contar con aprobación institucional.

**Alcance de la importación:** cinco comunidades del municipio **Santa Lucía Utatlán** y hasta 19 expedientes de referencia con un integrante identificado por el nombre disponible en el padrón. El importador no presupone que existan 19 huertos ni asigna cultivos, programas, coordenadas, fechas de ingreso, parentescos o teléfonos. La información insuficiente queda indicada en observaciones. Las familias existentes no se sobrescriben, fusionan ni eliminan. Los datos de origen y los documentos de revisión deben permanecer en `apps/api/private/cir-02/`, ignorada por Git.

**Antes de la carga:**

1. Verificar con la ONG qué participantes representan expedientes distintos y cuáles nombres están abreviados. Confirmar las cinco comunidades y su municipio. La discrepancia histórica de 18 huertos frente a 19 participantes se mantiene sin resolver hasta contar con respuesta.
2. Hacer y comprobar un respaldo externo de PostgreSQL; confirmar que `DATABASE_URL` apunta a la base de datos autorizada. Evitar producción hasta validar el procedimiento en una copia de desarrollo.
3. Desde **PowerShell**, en `apps/api`, ejecutar los siguientes comandos completos **en una sola línea**:

```powershell
node --test tests/cir-02-audit.test.mjs tests/cir-02-import.test.mjs
node scripts/cir-02-importar-familias.mjs --oficial private/cir-02/participantes-oficiales.csv
```

4. Revisar **localmente**, sin subirlos a Git, estos archivos generados:
   - `private/cir-02/plan-importacion.json`: acciones propuestas `CREAR`, `EXISTE` o `REVISAR`; código de revisión que identifica los datos y el estado de la BD.
   - `private/cir-02/revision-importacion.json`: **requiere completar manualmente** `responsable`, `fechaValidacion` (YYYY-MM-DD), `aprobacionInstitucional: true` únicamente tras autorización real, y para **cada participante** `decision` igual a la propuesta y `estadoFamilia` igual a `ACTIVA` solo si se confirmó su situación actual, o `PENDIENTE_VALIDACION` en caso contrario. En filas `EXISTE`, mantener `estadoFamilia` vacío. Una fila `REVISAR` bloquea toda la importación hasta su conciliación por una vía autorizada.
5. Si el plan es correcto, la revisión está completada y el respaldo fue confirmado, ejecutar con el **código obtenido de la simulación** y el correo de un usuario activo con permiso `FAMILIAS_WRITE` (o rol Dirección general):

```powershell
node scripts/cir-02-importar-familias.mjs --oficial private/cir-02/participantes-oficiales.csv --aplicar --respaldo-confirmado --confirmar CODIGO_DE_REVISION --usuario-correo correo@dominio.org
```

6. Verificar `private/cir-02/resultado-importacion.json`, volver a ejecutar la auditoría original y comparar los totales. Documentar cualquier diferencia con responsable y fecha, sin copiar datos personales al PR.

**Salvaguardas:** la simulación usa una transacción PostgreSQL de solo lectura; el modo `--aplicar` exige confirmación explícita de un respaldo verificado, código de revisión coincidente, plan no obsoleto, revisión individual de las 19 filas, autorización explícita y usuario con permisos. La carga ocurre dentro de una sola transacción `SERIALIZABLE`, con bitácora de altas de municipio, comunidades, familias e integrantes. Si falla, se hace `ROLLBACK`. Se mantiene separada de la carga de huertos y de CIR-07 (coordenadas).

**Precaución:** una aprobación para importar registros de referencia **no certifica** automáticamente que los 19 nombres estén completos, ni que los 18 huertos históricos sigan activos. No cerrar CIR-02 como Done mientras no estén conciliados los casos pendientes y las diferencias documentadas.
