# FIX7 — Operación agrícola y cobertura semanal

## Aplicación

Parche incremental para la rama que ya contiene FIX5 y FIX6.

1. `git apply --check ViviendasLeon_FIX7_operacion_agricola_visitas_20261111.patch`
2. `git apply ViviendasLeon_FIX7_operacion_agricola_visitas_20261111.patch`
3. `npm run build`
4. Desplegar la API y ejecutar la migración incluida con `cd apps/api && npx prisma migrate deploy --config prisma7.config.ts` según la configuración actual de Railway.
5. Cerrar e iniciar sesión otra vez como Técnico agropecuario para actualizar sus permisos.

## Alcance

- Permisos operativos del Técnico agropecuario (familias, huertos, cultivos, ciclos, producción, catálogos, capacitaciones). No se concede acceso institucional a administración de usuarios, roles, auditoría ni reportes reservados.
- Las clasificaciones de huerto son independientes: estructura (campo abierto, macrotúnel, mixto) y propiedad (familiar/comunitario). El nombre interno de huerto sigue en la BD por compatibilidad pero se evita en las tarjetas.
- El identificador de ciclo en PostgreSQL no se renumera; la interfaz presenta secuencias independientes por huerto.
- Finalizar un cultivo no elimina sus evaluaciones, cosechas ni ventas. Se puede registrar otra siembra en el mismo huerto. Esta acción requiere conexión.
- Etapa y calidad de evaluaciones históricas se recuperan de la captura original cuando faltan los enlaces a catálogos; el esquema no cambia. La migración agrega las opciones efectivamente presentes en el formulario.
- Cobertura de visitas: indicador informativo para familias con huerto activo; realizada en los últimos 8 días o programada; el historial y calendario siguen siendo los registros de origen. Los datos locales pueden estar desactualizados.

## Comprobaciones en Railway

- Técnico: abrir y editar familia, crear/editar huerto, registrar siembra, finalizar cultivo y administrar cultivos sin poder abrir administración de usuarios.
- Confirmar que las familias ACTIVA y RETIRADA se distingan visualmente; comprobar filtros, selectores de visitas y expediente.
- Huerto con una evaluación de visita antigua que informó etapa Almácigo y calidad Bueno: consultar esos dos valores.
- Finalizar una siembra activa y registrar otra; confirmar que cosechas y evaluaciones antiguas siguen visibles.
- Mi calendario: comprobar la cobertura de una familia sin cita, con cita agendada, y con visita realizada. Repetir con desconexión; no asumir que una lista local vacía indica cumplimiento.
- Volver a iniciar sesión tras migrar los permisos. No borrar IndexedDB ni la cola de visitas pendientes.

## Límites

No se ejecutaron pruebas manuales con PostgreSQL de Railway ni un teléfono Android; deben realizarse antes de fusionar a main. La migración de permisos debe completarse antes de validar el técnico.
