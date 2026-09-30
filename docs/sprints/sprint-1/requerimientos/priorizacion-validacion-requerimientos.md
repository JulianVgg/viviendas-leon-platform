# Priorización y validación de requerimientos

## 1. Objetivo

Revisar y priorizar los requerimientos funcionales y no funcionales definidos para la plataforma de Viviendas León Guatemala, con el propósito de establecer cuáles son indispensables para el Producto Mínimo Viable (MVP), cuáles deberán desarrollarse posteriormente y cuáles pueden considerarse funcionalidades complementarias.

Esta priorización permite concentrar los esfuerzos de desarrollo en las funcionalidades que resuelven directamente las necesidades principales identificadas durante el análisis del proyecto.

---

## 2. Contexto de validación

Los requerimientos funcionales RF-001 a RF-049 y los requerimientos no funcionales RNF-001 a RNF-023 constituyen la línea base actual de requerimientos del proyecto.

Debido a la indisponibilidad temporal del personal de Viviendas León para realizar una sesión adicional de validación, y considerando que la organización otorgó al equipo libertad para definir técnicamente las prioridades y el alcance inicial de la solución, se realizó una revisión interna de los requerimientos.

La priorización se realizó considerando:

- el problema identificado durante el análisis;
- el alcance aprobado del proyecto;
- las necesidades observadas en los procesos actuales;
- la importancia de cada funcionalidad para la operación básica del sistema;
- la conectividad irregular existente durante el trabajo de campo;
- el tiempo disponible para el desarrollo del proyecto.

Las decisiones documentadas podrán ajustarse posteriormente si Viviendas León presenta nuevos requerimientos u observaciones.

---

## 3. Criterios de priorización

Se utilizaron tres niveles de prioridad:

| Prioridad | Descripción |
|---|---|
| P0 | Requerimiento indispensable para el funcionamiento del MVP. |
| P1 | Requerimiento importante para la solución completa, pero que no bloquea el funcionamiento inicial del MVP. |
| P2 | Requerimiento complementario que puede desarrollarse posteriormente. |

Los requerimientos clasificados como P0 conforman el alcance funcional principal del MVP.

---

# 4. Priorización de requerimientos funcionales

## 4.1 Familias y beneficiarios

| ID | Prioridad | MVP | Observación |
|---|---|---|---|
| RF-001 | P0 | Sí | El registro de familias constituye la base de la información del sistema. |
| RF-002 | P0 | Sí | Permite registrar los integrantes relacionados con cada familia. |
| RF-003 | P0 | Sí | Es necesario mantener actualizada la información registrada. |
| RF-004 | P0 | Sí | Permite relacionar a las familias con su comunidad. |
| RF-005 | P0 | Sí | Permite identificar los programas institucionales en los que participa cada familia. |
| RF-006 | P0 | Sí | Permite controlar si una familia se encuentra activa, retirada o egresada. |
| RF-007 | P1 | No | El historial completo podrá construirse utilizando la información registrada por los demás módulos. |

## 4.2 Gestión agrícola

| ID | Prioridad | MVP | Observación |
|---|---|---|---|
| RF-008 | P0 | Sí | Los huertos son uno de los principales elementos de seguimiento del proyecto. |
| RF-009 | P0 | Sí | Es necesario conocer los cultivos existentes en cada huerto. |
| RF-010 | P0 | Sí | Permite registrar información básica de establecimiento de cultivos. |
| RF-011 | P0 | Sí | La producción agrícola constituye información importante para el seguimiento. |
| RF-012 | P0 | Sí | Las unidades de medida son necesarias para interpretar correctamente los registros de producción. |
| RF-013 | P1 | No | El registro de ventas e ingresos puede incorporarse después de completar el control agrícola básico. |
| RF-014 | P1 | No | El registro de plagas y enfermedades amplía el seguimiento agrícola, pero no bloquea el MVP. |
| RF-015 | P1 | No | Los porcentajes de daño y tratamientos dependen del seguimiento de plagas y enfermedades. |
| RF-016 | P0 | Sí | Permite mantener trazabilidad de los insumos entregados a las familias. |
| RF-017 | P1 | No | El historial agrícola podrá generarse utilizando los registros existentes del módulo. |

## 4.3 Visitas, asistencia técnica y capacitaciones

| ID | Prioridad | MVP | Observación |
|---|---|---|---|
| RF-018 | P1 | No | La planificación anticipada de visitas puede incorporarse después del registro básico de visitas. |
| RF-019 | P0 | Sí | Toda visita debe relacionarse con una familia y un responsable. |
| RF-020 | P0 | Sí | Permite documentar los resultados obtenidos durante las visitas. |
| RF-021 | P0 | Sí | Permite registrar el estado observado de los huertos durante el trabajo de campo. |
| RF-022 | P0 | Sí | Las recomendaciones permiten dar seguimiento a la asistencia técnica proporcionada. |
| RF-023 | P1 | No | Las fechas específicas de seguimiento pueden incorporarse posteriormente. |
| RF-024 | P1 | No | Las capacitaciones forman parte del alcance general, pero no bloquean el funcionamiento inicial del sistema. |
| RF-025 | P1 | No | Depende del desarrollo de la gestión completa de capacitaciones. |

## 4.4 Funcionamiento sin conexión y sincronización

| ID | Prioridad | MVP | Observación |
|---|---|---|---|
| RF-026 | P0 | Sí | Es indispensable debido a la conectividad irregular existente durante las visitas de campo. |
| RF-027 | P0 | Sí | Evita la pérdida de información capturada cuando no existe conexión. |
| RF-028 | P0 | Sí | Permite identificar información que todavía no ha sido enviada al servidor. |
| RF-029 | P0 | Sí | Permite integrar posteriormente los registros realizados sin conexión. |
| RF-030 | P0 | Sí | Permite conocer si la información fue sincronizada correctamente. |

## 4.5 Reportes, indicadores y alertas

| ID | Prioridad | MVP | Observación |
|---|---|---|---|
| RF-031 | P0 | Sí | La generación de reportes permite aprovechar la información centralizada. |
| RF-032 | P0 | Sí | Los filtros permiten consultar únicamente la información necesaria. |
| RF-033 | P1 | No | Los indicadores específicos por programa pueden desarrollarse posteriormente. |
| RF-034 | P0 | Sí | Familias atendidas y huertos activos constituyen indicadores básicos del sistema. |
| RF-035 | P1 | No | Los indicadores agrícolas avanzados pueden agregarse después del MVP. |
| RF-036 | P2 | No | Las alertas constituyen una funcionalidad complementaria. |
| RF-037 | P2 | No | La detección automática de registros incompletos puede desarrollarse posteriormente. |
| RF-038 | P0 | Sí | La exportación a Excel facilita el uso institucional de la información. |
| RF-039 | P1 | No | La generación en PDF puede incorporarse después de disponer de los reportes básicos. |
| RF-040 | P2 | No | La comparación avanzada entre períodos no es indispensable para la primera versión. |

## 4.6 Usuarios, roles, permisos y auditoría

| ID | Prioridad | MVP | Observación |
|---|---|---|---|
| RF-041 | P0 | Sí | Es necesario crear cuentas para acceder al sistema. |
| RF-042 | P0 | Sí | Es necesario mantener actualizada la información de los usuarios. |
| RF-043 | P1 | No | La desactivación puede incorporarse después de la administración básica de usuarios. |
| RF-044 | P0 | Sí | Permite establecer las responsabilidades de cada usuario. |
| RF-045 | P0 | Sí | Es indispensable restringir las funcionalidades según los permisos asignados. |
| RF-046 | P0 | Sí | La autenticación es necesaria para acceder a las funciones protegidas. |
| RF-047 | P1 | No | El registro detallado de operaciones puede desarrollarse después del núcleo funcional. |
| RF-048 | P1 | No | Depende de la implementación del registro de operaciones. |
| RF-049 | P2 | No | Los filtros avanzados de auditoría pueden incorporarse posteriormente. |

---

# 5. Priorización de requerimientos no funcionales

## 5.1 Seguridad

| ID | Prioridad | MVP | Observación |
|---|---|---|---|
| RNF-001 | P0 | Sí | La autenticación es indispensable para proteger el acceso al sistema. |
| RNF-002 | P0 | Sí | Los usuarios deben acceder únicamente a las funciones autorizadas. |
| RNF-003 | P0 | Sí | La información institucional debe protegerse frente a accesos no autorizados. |
| RNF-004 | P1 | No | La trazabilidad detallada se completará con el módulo de auditoría. |
| RNF-005 | P0 | Sí | Las comunicaciones entre cliente y servidor deberán utilizar mecanismos seguros. |

## 5.2 Usabilidad

| ID | Prioridad | MVP | Observación |
|---|---|---|---|
| RNF-006 | P0 | Sí | La interfaz debe ser comprensible para los usuarios de la organización. |
| RNF-007 | P0 | Sí | La plataforma deberá funcionar tanto en computadoras como en dispositivos móviles. |
| RNF-008 | P0 | Sí | Las validaciones reducen errores durante el ingreso de información. |
| RNF-009 | P0 | Sí | Las funciones utilizadas en campo requieren una interfaz adecuada para dispositivos móviles. |

## 5.3 Rendimiento

| ID | Prioridad | MVP | Observación |
|---|---|---|---|
| RNF-010 | P0 | Sí | Las operaciones habituales deberán responder adecuadamente durante el uso normal. |
| RNF-011 | P1 | No | La optimización avanzada de generación de reportes podrá realizarse posteriormente. |
| RNF-012 | P0 | Sí | La sincronización no deberá requerir el reingreso manual de información. |

## 5.4 Disponibilidad y conectividad irregular

| ID | Prioridad | MVP | Observación |
|---|---|---|---|
| RNF-013 | P0 | Sí | El sistema deberá permitir acceso remoto mediante Internet cuando exista conectividad. |
| RNF-014 | P0 | Sí | La solución deberá contemplar interrupciones de conectividad durante el trabajo de campo. |
| RNF-015 | P0 | Sí | La pérdida de conexión no deberá provocar pérdida de datos capturados localmente. |
| RNF-016 | P0 | Sí | Los registros pendientes deberán recuperarse al restablecerse la conexión. |

## 5.5 Integridad y consistencia de datos

| ID | Prioridad | MVP | Observación |
|---|---|---|---|
| RNF-017 | P0 | Sí | Los datos deberán validarse antes de almacenarse. |
| RNF-018 | P0 | Sí | Las relaciones entre las entidades del sistema deberán mantenerse consistentes. |
| RNF-019 | P0 | Sí | Se deberán prevenir registros duplicados cuando corresponda. |
| RNF-020 | P0 | Sí | La sincronización deberá preservar la integridad de la información. |

## 5.6 Mantenibilidad y documentación

| ID | Prioridad | MVP | Observación |
|---|---|---|---|
| RNF-021 | P1 | No | La documentación técnica deberá completarse durante el desarrollo y antes de la entrega final. |
| RNF-022 | P1 | No | La documentación de usuario deberá completarse antes de la entrega final. |
| RNF-023 | P0 | Sí | La solución utilizará una estructura modular que facilite el mantenimiento y crecimiento del sistema. |

---

# 6. Alcance definido para el MVP

El Producto Mínimo Viable de la plataforma de Viviendas León comprenderá las funcionalidades esenciales necesarias para centralizar la información y permitir el trabajo operativo básico de la organización.

El MVP incluirá:

- autenticación de usuarios;
- administración básica de usuarios, roles y permisos;
- registro y actualización de familias beneficiarias;
- registro de integrantes de las familias;
- asociación de familias con comunidades y programas;
- gestión del estado de las familias;
- registro de huertos;
- registro de cultivos;
- registro de siembras y trasplantes;
- registro de producción agrícola;
- manejo de unidades de medida;
- registro de insumos agrícolas entregados;
- registro de visitas realizadas;
- asociación de visitas con familias y trabajadores responsables;
- registro de resultados de visitas;
- evaluación básica de huertos;
- registro de recomendaciones técnicas;
- captura de información durante períodos sin conexión;
- almacenamiento temporal de información local;
- identificación de registros pendientes de sincronización;
- sincronización de registros cuando se restablezca la conexión;
- control del estado de sincronización;
- generación básica de reportes;
- aplicación de filtros sobre reportes;
- indicadores básicos de familias atendidas y huertos activos;
- exportación de información a Excel.

El MVP deberá cumplir además con los requerimientos no funcionales considerados P0 relacionados con seguridad, usabilidad, funcionamiento móvil, rendimiento básico, conectividad irregular, integridad de datos y mantenibilidad.

---

# 7. Funcionalidades posteriores al MVP

Los siguientes requerimientos continúan formando parte del alcance general del proyecto, pero podrán desarrollarse después de completar el MVP:

| ID | Funcionalidad | Prioridad |
|---|---|---|
| RF-007 | Historial general de actividades de una familia | P1 |
| RF-013 | Registro de ventas e ingresos aproximados | P1 |
| RF-014 | Registro de plagas y enfermedades | P1 |
| RF-015 | Registro de daño y tratamientos | P1 |
| RF-017 | Historial agrícola | P1 |
| RF-018 | Planificación de visitas | P1 |
| RF-023 | Seguimiento de recomendaciones | P1 |
| RF-024 | Registro de capacitaciones | P1 |
| RF-025 | Información detallada de capacitaciones | P1 |
| RF-033 | Indicadores de programas institucionales | P1 |
| RF-035 | Indicadores de producción, visitas, plagas e insumos | P1 |
| RF-036 | Alertas de actividades pendientes | P2 |
| RF-037 | Identificación automática de registros incompletos | P2 |
| RF-039 | Generación de reportes PDF | P1 |
| RF-040 | Comparación de información entre períodos | P2 |
| RF-043 | Desactivación de usuarios | P1 |
| RF-047 | Registro detallado de operaciones | P1 |
| RF-048 | Consulta de bitácora | P1 |
| RF-049 | Filtros avanzados de auditoría | P2 |

Los requerimientos clasificados como P1 deberán considerarse una vez implementado el núcleo funcional del sistema.

Los requerimientos clasificados como P2 podrán incorporarse si el cronograma y los recursos disponibles lo permiten o en futuras iteraciones del sistema.

---

# 8. Cambios y observaciones

Durante esta revisión no se identificaron requerimientos que deban eliminarse de la línea base actual.

La principal modificación realizada fue la clasificación de los requerimientos según su importancia para el MVP.

El módulo de voluntariados no forma parte del alcance de esta versión del sistema y, por lo tanto, no se incluyen requerimientos relacionados con dicho módulo.

Los requerimientos P1 y P2 no se consideran eliminados. Permanecen registrados como parte del alcance general o como posibles mejoras posteriores.

---

# 9. Resultado de la validación

Se revisaron los requerimientos funcionales RF-001 a RF-049 y los requerimientos no funcionales RNF-001 a RNF-023.

Como resultado se definieron:

- los requerimientos prioritarios;
- el alcance del MVP;
- las funcionalidades posteriores al MVP;
- los requerimientos complementarios;
- los requerimientos no funcionales indispensables para la primera versión.

La validación realizada corresponde a una validación técnica interna del equipo, efectuada con base en la información recopilada durante el análisis del proyecto y en la autorización proporcionada por Viviendas León para tomar decisiones relacionadas con la priorización y el alcance inicial de la solución.

Los requerimientos podrán revisarse nuevamente si durante el desarrollo se identifican nuevas necesidades o si Viviendas León proporciona observaciones adicionales.

---

# 10. Estado de los criterios de aceptación

| Criterio | Estado |
|---|---|
| Requerimientos revisados | Completado |
| Requerimientos prioritarios identificados | Completado |
| Alcance del MVP definido | Completado |
| Funcionalidades futuras identificadas | Completado |
| Cambios solicitados documentados | Completado |
| Requerimientos validados | Completado |