# Matriz de trazabilidad de requerimientos

Esta matriz relaciona los requerimientos funcionales y no funcionales definidos para
la plataforma de ViviendasLeón Guatemala con los módulos, elementos del alcance y
objetivos específicos del proyecto.

La matriz permite verificar que los requerimientos se encuentren dentro del alcance
actual aprobado, identificar posibles duplicidades y conservar trazabilidad entre las
necesidades identificadas y las funcionalidades que serán desarrolladas.

El módulo de voluntariado queda fuera del alcance de la versión actual de los
requerimientos y, por esta razón, no se incluyen requerimientos específicos para
dicho módulo.

---

## 1. Objetivos relacionados

Para facilitar la trazabilidad se utilizan los siguientes identificadores de referencia
para los objetivos específicos del proyecto:

| ID | Objetivo |
|---|---|
| OE-01 | Analizar las necesidades operativas y los procesos institucionales para especificar los requerimientos funcionales y no funcionales de la plataforma. |
| OE-02 | Diseñar la arquitectura de software, modelo de datos, módulos, interfaces de usuario y mecanismos de seguridad y sincronización. |
| OE-03 | Desarrollar la lógica del negocio, API y base de datos para integrar el procesamiento y almacenamiento de la información institucional. |
| OE-04 | Desarrollar la interfaz de usuario y los mecanismos de almacenamiento temporal y sincronización para permitir el uso desde computadoras y dispositivos móviles ante interrupciones de conectividad. |
| OE-05 | Evaluar la funcionalidad, seguridad, usabilidad y rendimiento mediante pruebas unitarias, de integración y de aceptación. |
| OE-06 | Desplegar la plataforma en infraestructura alojada en la nube para proporcionar disponibilidad y acceso remoto al personal autorizado. |
| OE-07 | Capacitar al personal para favorecer el uso adecuado de los módulos y la adopción operativa de la plataforma. |

---

## 2. Resumen de cobertura por alcance

| Elemento del alcance | Requerimientos funcionales | Requerimientos no funcionales |
|---|---|---|
| Familias y beneficiarios | RF-001 a RF-007 | RNF-017 a RNF-019 |
| Gestión agrícola | RF-008 a RF-017 | RNF-017 a RNF-019 |
| Visitas, asistencia técnica y capacitaciones | RF-018 a RF-025 | RNF-006 a RNF-010, RNF-014 a RNF-019 |
| Funcionamiento sin conexión y sincronización | RF-026 a RF-030 | RNF-012, RNF-014 a RNF-016, RNF-020 |
| Reportes, indicadores y alertas | RF-031 a RF-040 | RNF-010, RNF-011, RNF-017 |
| Usuarios, roles, permisos y auditoría | RF-041 a RF-049 | RNF-001 a RNF-005 |
| Usabilidad y diseño adaptable | — | RNF-006 a RNF-009 |
| Rendimiento | — | RNF-010 a RNF-012 |
| Disponibilidad y conectividad irregular | RF-026 a RF-030 | RNF-013 a RNF-016 |
| Integridad y consistencia de datos | — | RNF-017 a RNF-020 |
| Mantenibilidad y documentación | — | RNF-021 a RNF-023 |

---

# 3. Matriz detallada de requerimientos funcionales

## 3.1 Familias y beneficiarios

| ID | Requerimiento | Módulo | Elemento del alcance | Objetivo relacionado | Observación |
|---|---|---|---|---|---|
| RF-001 | El sistema deberá permitir registrar familias beneficiarias. | Familias y beneficiarios | Registro de familias | OE-03 | Función principal del módulo. |
| RF-002 | El sistema deberá permitir registrar los integrantes asociados a una familia. | Familias y beneficiarios | Gestión de beneficiarios | OE-03 | Los integrantes quedan relacionados con una familia. |
| RF-003 | El sistema deberá permitir actualizar la información de las familias y sus integrantes. | Familias y beneficiarios | Actualización de familias y beneficiarios | OE-03 | Permite mantener actualizados los registros. |
| RF-004 | El sistema deberá permitir asociar una familia con una comunidad. | Familias y beneficiarios | Asignación de comunidad | OE-03 | Relaciona familias con su ubicación comunitaria. |
| RF-005 | El sistema deberá permitir asociar una familia con uno o más programas institucionales. | Familias y beneficiarios | Asignación de programas | OE-03 | Permite identificar los programas en los que participa cada familia. |
| RF-006 | El sistema deberá permitir gestionar el estado de una familia como activa, retirada o egresada. | Familias y beneficiarios | Gestión de estado | OE-03 | Permite controlar la condición actual de la familia. |
| RF-007 | El sistema deberá permitir consultar el historial de actividades asociadas a una familia. | Familias y beneficiarios | Historial de familias | OE-03 | Requisito relacionado con trazabilidad institucional. |

## 3.2 Gestión agrícola

| ID | Requerimiento | Módulo | Elemento del alcance | Objetivo relacionado | Observación |
|---|---|---|---|---|---|
| RF-008 | El sistema deberá permitir registrar y administrar huertos asociados a las familias. | Gestión agrícola | Gestión de huertos | OE-03 | Los huertos se relacionan con las familias beneficiarias. |
| RF-009 | El sistema deberá permitir registrar cultivos asociados a los huertos. | Gestión agrícola | Gestión de cultivos | OE-03 | Permite mantener los cultivos vinculados con cada huerto. |
| RF-010 | El sistema deberá permitir registrar fechas de siembra o trasplante y cantidades establecidas. | Gestión agrícola | Seguimiento de cultivos | OE-03 | Permite registrar el inicio y cantidad de los cultivos. |
| RF-011 | El sistema deberá permitir registrar la producción agrícola. | Gestión agrícola | Registro de producción | OE-03 | Información utilizada para seguimiento productivo. |
| RF-012 | El sistema deberá permitir registrar las unidades de medida utilizadas para la producción. | Gestión agrícola | Unidades de producción | OE-03 | Facilita la estandarización de los datos productivos. |
| RF-013 | El sistema deberá permitir registrar información relacionada con ventas e ingresos aproximados. | Gestión agrícola | Producción y comercialización | OE-03 | Relaciona producción con resultados económicos. |
| RF-014 | El sistema deberá permitir registrar plagas y enfermedades identificadas en los cultivos. | Gestión agrícola | Control fitosanitario | OE-03 | Permite mantener seguimiento de problemas agrícolas. |
| RF-015 | El sistema deberá permitir registrar porcentajes de daño y tratamientos aplicados. | Gestión agrícola | Control fitosanitario | OE-03 | Complementa el seguimiento de plagas y enfermedades. |
| RF-016 | El sistema deberá permitir registrar los insumos agrícolas entregados a las familias. | Gestión agrícola | Gestión de insumos | OE-03 | Relaciona recursos entregados con familias beneficiarias. |
| RF-017 | El sistema deberá permitir consultar el historial agrícola de una familia. | Gestión agrícola | Historial agrícola | OE-03 | Consolida la información agrícola asociada a cada familia. |

## 3.3 Visitas, asistencia técnica y capacitaciones

| ID | Requerimiento | Módulo | Elemento del alcance | Objetivo relacionado | Observación |
|---|---|---|---|---|---|
| RF-018 | El sistema deberá permitir planificar visitas de campo. | Visitas, asistencia técnica y capacitaciones | Planificación de visitas | OE-03 | Permite organizar las actividades de campo. |
| RF-019 | El sistema deberá permitir asignar una visita a una familia y a un trabajador responsable. | Visitas, asistencia técnica y capacitaciones | Asignación de visitas | OE-03 | Relaciona familia, actividad y responsable. |
| RF-020 | El sistema deberá permitir registrar los resultados de una visita de campo. | Visitas, asistencia técnica y capacitaciones | Registro de visitas | OE-03 | Conserva la información recopilada en campo. |
| RF-021 | El sistema deberá permitir registrar evaluaciones de los huertos durante las visitas. | Visitas, asistencia técnica y capacitaciones | Evaluación de huertos | OE-03 | Se relaciona también con gestión agrícola. |
| RF-022 | El sistema deberá permitir registrar recomendaciones derivadas de una asistencia técnica. | Visitas, asistencia técnica y capacitaciones | Asistencia técnica | OE-03 | Permite mantener continuidad del acompañamiento técnico. |
| RF-023 | El sistema deberá permitir registrar fechas de seguimiento de las recomendaciones. | Visitas, asistencia técnica y capacitaciones | Seguimiento técnico | OE-03 | Facilita controlar actividades pendientes. |
| RF-024 | El sistema deberá permitir registrar capacitaciones realizadas. | Visitas, asistencia técnica y capacitaciones | Gestión de capacitaciones | OE-03 | Mantiene historial de actividades formativas. |
| RF-025 | El sistema deberá permitir registrar el tema, fecha, facilitador y participantes de una capacitación. | Visitas, asistencia técnica y capacitaciones | Datos de capacitaciones | OE-03 | Complementa el registro de capacitaciones. |

## 3.4 Funcionamiento sin conexión y sincronización

| ID | Requerimiento | Módulo | Elemento del alcance | Objetivo relacionado | Observación |
|---|---|---|---|---|---|
| RF-026 | El sistema deberá permitir registrar información de campo cuando el dispositivo no tenga conexión a Internet. | Funcionamiento sin conexión y sincronización | Captura offline | OE-04 | Responde a la conectividad irregular de las comunidades. |
| RF-027 | El sistema deberá almacenar temporalmente los registros realizados sin conexión en el dispositivo. | Funcionamiento sin conexión y sincronización | Almacenamiento local | OE-04 | Los datos permanecen disponibles hasta su sincronización. |
| RF-028 | El sistema deberá identificar los registros pendientes de sincronización. | Funcionamiento sin conexión y sincronización | Control de sincronización | OE-04 | Permite diferenciar registros locales pendientes. |
| RF-029 | El sistema deberá sincronizar los registros pendientes cuando se restablezca la conexión. | Funcionamiento sin conexión y sincronización | Sincronización de datos | OE-04 | Transfiere los datos locales al servidor. |
| RF-030 | El sistema deberá actualizar el estado de los registros después de una sincronización exitosa. | Funcionamiento sin conexión y sincronización | Estado de sincronización | OE-04 | Permite identificar los registros ya sincronizados. |

## 3.5 Reportes, indicadores y alertas

| ID | Requerimiento | Módulo | Elemento del alcance | Objetivo relacionado | Observación |
|---|---|---|---|---|---|
| RF-031 | El sistema deberá permitir generar reportes de la información registrada. | Reportes, indicadores y alertas | Generación de reportes | OE-03 | Utiliza información de los diferentes módulos. |
| RF-032 | El sistema deberá permitir filtrar información de los reportes por diferentes criterios. | Reportes, indicadores y alertas | Filtros de reportes | OE-03 | Facilita análisis por distintos criterios. |
| RF-033 | El sistema deberá presentar indicadores relacionados con los programas institucionales. | Reportes, indicadores y alertas | Indicadores | OE-03 | Facilita el monitoreo de los programas. |
| RF-034 | El sistema deberá presentar indicadores de familias atendidas y huertos activos. | Reportes, indicadores y alertas | Indicadores | OE-03 | Utiliza información de familias y gestión agrícola. |
| RF-035 | El sistema deberá presentar indicadores relacionados con producción, visitas, plagas e insumos. | Reportes, indicadores y alertas | Indicadores | OE-03 | Consolida datos provenientes de diferentes módulos. |
| RF-036 | El sistema deberá generar alertas relacionadas con actividades pendientes. | Reportes, indicadores y alertas | Alertas | OE-03 | Apoya el seguimiento operativo. |
| RF-037 | El sistema deberá identificar registros incompletos que requieran atención. | Reportes, indicadores y alertas | Alertas y validación | OE-03 | Facilita identificar información pendiente. |
| RF-038 | El sistema deberá permitir exportar información en formato Excel. | Reportes, indicadores y alertas | Exportación de reportes | OE-03 | Facilita el uso externo de la información. |
| RF-039 | El sistema deberá permitir generar reportes en formato PDF. | Reportes, indicadores y alertas | Exportación de reportes | OE-03 | Permite generar documentos institucionales. |
| RF-040 | El sistema deberá permitir comparar información correspondiente a diferentes periodos. | Reportes, indicadores y alertas | Comparación de periodos | OE-03 | Apoya análisis trimestral y semestral. |

## 3.6 Usuarios, roles, permisos y auditoría

| ID | Requerimiento | Módulo | Elemento del alcance | Objetivo relacionado | Observación |
|---|---|---|---|---|---|
| RF-041 | El sistema deberá permitir crear usuarios. | Usuarios, roles, permisos y auditoría | Gestión de usuarios | OE-03 | Función administrativa. |
| RF-042 | El sistema deberá permitir actualizar usuarios. | Usuarios, roles, permisos y auditoría | Gestión de usuarios | OE-03 | Mantiene actualizada la información de las cuentas. |
| RF-043 | El sistema deberá permitir desactivar usuarios. | Usuarios, roles, permisos y auditoría | Gestión de usuarios | OE-03 | Permite retirar acceso sin eliminar necesariamente el historial. |
| RF-044 | El sistema deberá permitir asignar roles a los usuarios. | Usuarios, roles, permisos y auditoría | Roles y permisos | OE-02 | Relacionado directamente con el diseño de seguridad y autorización. |
| RF-045 | El sistema deberá controlar el acceso a las funcionalidades según los permisos del usuario. | Usuarios, roles, permisos y auditoría | Control de acceso | OE-02 | Relacionado con RNF-002; no constituye duplicidad porque uno es funcional y el otro establece una condición de seguridad. |
| RF-046 | El sistema deberá permitir iniciar y cerrar sesión. | Usuarios, roles, permisos y auditoría | Autenticación | OE-02 | Permite controlar el acceso de usuarios autorizados. |
| RF-047 | El sistema deberá registrar las operaciones relevantes realizadas por los usuarios. | Usuarios, roles, permisos y auditoría | Auditoría y trazabilidad | OE-02 | Relacionado con RNF-004; el RF define la función y el RNF la condición de trazabilidad. |
| RF-048 | El sistema deberá permitir consultar la bitácora de operaciones. | Usuarios, roles, permisos y auditoría | Auditoría | OE-03 | Permite consultar las operaciones registradas. |
| RF-049 | El sistema deberá permitir filtrar los registros de auditoría por usuario, fecha y tipo de operación. | Usuarios, roles, permisos y auditoría | Consulta de auditoría | OE-03 | Facilita la revisión de las operaciones registradas. |

---

# 4. Matriz detallada de requerimientos no funcionales

## 4.1 Seguridad

| ID | Requerimiento | Módulo o área relacionada | Elemento del alcance | Objetivo relacionado | Observación |
|---|---|---|---|---|---|
| RNF-001 | El sistema deberá requerir autenticación para acceder a las funciones protegidas. | Usuarios, roles, permisos y auditoría | Seguridad y autenticación | OE-02 | Requisito transversal para áreas protegidas. |
| RNF-002 | El sistema deberá restringir las funcionalidades según el rol y permisos asignados al usuario. | Usuarios, roles, permisos y auditoría | Autorización y control de acceso | OE-02 | Complementa RF-045. |
| RNF-003 | El sistema deberá proteger la información institucional frente a accesos no autorizados. | Plataforma general | Seguridad de la información | OE-02 | Requisito transversal. |
| RNF-004 | El sistema deberá registrar las operaciones relevantes realizadas por los usuarios para mantener trazabilidad. | Usuarios, roles, permisos y auditoría | Auditoría y trazabilidad | OE-02 | Complementa RF-047. |
| RNF-005 | La comunicación entre el cliente y el servidor deberá realizarse mediante conexiones seguras. | Plataforma general | Seguridad de comunicaciones | OE-02 | También se relaciona con el despliegue en infraestructura remota. |

## 4.2 Usabilidad

| ID | Requerimiento | Módulo o área relacionada | Elemento del alcance | Objetivo relacionado | Observación |
|---|---|---|---|---|---|
| RNF-006 | La interfaz deberá presentar información y controles de forma clara y comprensible para los usuarios. | Plataforma general | Usabilidad | OE-05 | Aplica a todos los módulos con interfaz de usuario. |
| RNF-007 | La interfaz deberá adaptarse a computadoras y dispositivos móviles. | Plataforma general | Diseño adaptable | OE-04 | Requisito necesario para oficina y trabajo de campo. |
| RNF-008 | Los formularios deberán proporcionar mensajes claros cuando exista información inválida o incompleta. | Plataforma general | Validación y usabilidad | OE-05 | Se relaciona con la calidad de la interacción del usuario. |
| RNF-009 | Las funciones utilizadas durante las visitas de campo deberán poder ejecutarse mediante una interfaz adecuada para dispositivos móviles. | Visitas y trabajo de campo | Interfaz móvil | OE-04 | Requisito específico para actividades realizadas en campo. |

## 4.3 Rendimiento

| ID | Requerimiento | Módulo o área relacionada | Elemento del alcance | Objetivo relacionado | Observación |
|---|---|---|---|---|---|
| RNF-010 | El sistema deberá responder a las operaciones habituales de consulta y registro en un tiempo adecuado para el uso operativo. | Plataforma general | Rendimiento | OE-05 | Aplica a consultas y registros de todos los módulos. |
| RNF-011 | La generación de reportes deberá procesar la información solicitada sin bloquear las demás funciones del sistema. | Reportes, indicadores y alertas | Rendimiento de reportes | OE-05 | Requisito específico del procesamiento de reportes. |
| RNF-012 | El mecanismo de sincronización deberá procesar los registros pendientes sin requerir que el usuario vuelva a ingresarlos manualmente. | Funcionamiento sin conexión y sincronización | Rendimiento y sincronización | OE-04 | Evita duplicar el trabajo del usuario. |

## 4.4 Disponibilidad y conectividad irregular

| ID | Requerimiento | Módulo o área relacionada | Elemento del alcance | Objetivo relacionado | Observación |
|---|---|---|---|---|---|
| RNF-013 | La plataforma deberá permitir el acceso a la información desde las ubicaciones autorizadas mediante conexión a Internet. | Plataforma general | Disponibilidad remota | OE-06 | Relacionado con el despliegue en infraestructura alojada en la nube. |
| RNF-014 | Las funciones de captura de información de campo deberán contemplar interrupciones temporales de conectividad. | Funcionamiento sin conexión y sincronización | Conectividad irregular | OE-04 | Requisito fundamental para las comunidades atendidas. |
| RNF-015 | La pérdida temporal de conexión no deberá provocar la pérdida de los datos registrados localmente. | Funcionamiento sin conexión y sincronización | Persistencia local | OE-04 | Protege los registros capturados sin conexión. |
| RNF-016 | El sistema deberá permitir la recuperación de los registros pendientes después del restablecimiento de la conectividad. | Funcionamiento sin conexión y sincronización | Recuperación y sincronización | OE-04 | Complementa RF-029 y RF-030. |

## 4.5 Integridad y consistencia de datos

| ID | Requerimiento | Módulo o área relacionada | Elemento del alcance | Objetivo relacionado | Observación |
|---|---|---|---|---|---|
| RNF-017 | El sistema deberá validar los datos antes de almacenarlos. | Plataforma general | Validación de datos | OE-02 | Requisito transversal para los módulos que registran información. |
| RNF-018 | El sistema deberá mantener relaciones consistentes entre familias, beneficiarios, huertos, cultivos, visitas y demás registros asociados. | Plataforma general | Integridad relacional | OE-02 | Relacionado con el diseño del modelo de datos. |
| RNF-019 | El sistema deberá evitar la creación de registros duplicados cuando corresponda. | Plataforma general | Consistencia de datos | OE-02 | Reduce inconsistencias en la información institucional. |
| RNF-020 | Las operaciones de sincronización deberán preservar la integridad de los registros almacenados. | Funcionamiento sin conexión y sincronización | Integridad durante sincronización | OE-04 | Requisito específico del mecanismo offline. |

## 4.6 Mantenibilidad y documentación

| ID | Requerimiento | Módulo o área relacionada | Elemento del alcance | Objetivo relacionado | Observación |
|---|---|---|---|---|---|
| RNF-021 | El sistema deberá contar con documentación técnica suficiente para facilitar su mantenimiento. | Plataforma general | Documentación técnica | OE-02 | Facilita mantenimiento y evolución posterior. |
| RNF-022 | El sistema deberá contar con documentación de usuario para las funciones principales. | Plataforma general | Documentación de usuario | OE-07 | Servirá como apoyo para capacitación y adopción de la plataforma. |
| RNF-023 | La solución deberá mantener una estructura modular que facilite la incorporación o modificación de funcionalidades. | Arquitectura de software | Mantenibilidad y modularidad | OE-02 | Se relaciona directamente con el diseño de la arquitectura. |

---

# 5. Roles contemplados

Los requerimientos relacionados con autenticación, autorización, administración y
auditoría contemplan los siguientes roles definidos para la plataforma:

- Trabajador de campo.
- Coordinación.
- Dirección operativa.
- Administración.
- Auditoría.

El acceso a las funcionalidades dependerá de los permisos asignados a cada rol.

---

# 6. Exclusión del alcance

El módulo de voluntariado no forma parte del alcance actual aprobado para esta
versión de la especificación.

Por esta razón, no se incluyen requerimientos funcionales ni no funcionales
específicos relacionados con registro de grupos de voluntarios, asignación de
actividades, responsables o resultados de voluntariado.

La incorporación de este módulo en una versión posterior requerirá actualizar
los requerimientos y la presente matriz de trazabilidad.

---

# 7. Revisión de duplicidades y relaciones entre requerimientos

Durante la revisión se identificaron requerimientos funcionales y no funcionales
que se encuentran relacionados, pero no representan duplicidades injustificadas.

### RF-045 y RNF-002

RF-045 establece funcionalmente que el sistema debe controlar el acceso según
los permisos del usuario.

RNF-002 establece como condición de seguridad que las funcionalidades deben
restringirse según el rol y permisos asignados.

Ambos requisitos se complementan y se mantienen separados debido a que uno
define una función del sistema y el otro una condición no funcional de seguridad.

### RF-047 y RNF-004

RF-047 establece funcionalmente que el sistema debe registrar las operaciones
relevantes realizadas por los usuarios.

RNF-004 establece que dicho registro debe contribuir a mantener la trazabilidad
del sistema.

Ambos requisitos se conservan debido a que el requerimiento funcional define
la operación y el requerimiento no funcional establece la propiedad esperada de
trazabilidad.

### Funcionamiento sin conexión

Los requerimientos RF-026 a RF-030 se encuentran relacionados con RNF-012,
RNF-014, RNF-015, RNF-016 y RNF-020.

Esta relación no representa duplicidad, ya que los requerimientos funcionales
establecen las operaciones que deberá realizar el sistema, mientras los
requerimientos no funcionales establecen las condiciones de rendimiento,
conectividad e integridad que deberán mantenerse durante dichas operaciones.