# Reglas de negocio y alcance definitivo

## 1. Objetivo

Consolidar las reglas de negocio que condicionan el comportamiento de la plataforma de Viviendas León y establecer el alcance definitivo de la versión que será desarrollada.

Este documento toma como referencia los requerimientos funcionales RF-001 a RF-049, los requerimientos no funcionales RNF-001 a RNF-023 y la priorización realizada previamente.

Las reglas aquí establecidas deberán utilizarse como referencia durante el diseño de la base de datos, desarrollo del backend, construcción de interfaces, pruebas y validación de funcionalidades.

---

# 2. Criterio para definir el alcance

Los requerimientos fueron previamente clasificados utilizando las prioridades P0, P1 y P2.

Para establecer el alcance definitivo se utilizará el siguiente criterio:

| Prioridad | Tratamiento |
|---|---|
| P0 | Forma parte del MVP y es indispensable para la primera versión funcional. |
| P1 | Forma parte de la versión definitiva del proyecto y será implementado después de completar el núcleo del MVP. |
| P2 | No forma parte de la versión que será desarrollada actualmente. Se conserva como posible mejora futura. |

Por lo tanto:

- **MVP:** requerimientos P0.
- **Alcance definitivo de esta versión:** requerimientos P0 + P1.
- **Fuera del alcance de esta versión:** requerimientos P2 y funcionalidades no contempladas en la línea base.

---

# 3. Reglas generales del sistema

## RN-001 — Conservación de información

Los registros que posean información histórica asociada no deberán eliminarse físicamente cuando su eliminación pueda provocar pérdida de trazabilidad.

Cuando corresponda, deberá utilizarse un estado que permita identificar que el registro ya no se encuentra activo.

## RN-002 — Integridad de relaciones

No deberán existir registros dependientes sin una entidad principal válida.

Por ejemplo:

- un huerto deberá pertenecer a una familia;
- un cultivo deberá pertenecer a un huerto;
- una visita deberá pertenecer a una familia;
- una evaluación de huerto deberá relacionarse con una visita y un huerto válidos.

## RN-003 — Validación de información

La información deberá validarse antes de almacenarse.

Los campos obligatorios no podrán almacenarse vacíos y los valores numéricos deberán encontrarse dentro de los rangos definidos para cada operación.

## RN-004 — Prevención de duplicados

El sistema deberá aplicar validaciones que permitan evitar registros duplicados cuando exista información suficiente para identificar que se trata del mismo elemento.

## RN-005 — Trazabilidad

Los registros deberán conservar la información necesaria para conocer cuándo fueron creados o actualizados y, cuando corresponda, qué usuario realizó la operación.

---

# 4. Familias y beneficiarios

## RN-006 — Familia como entidad principal

La familia constituye una de las entidades principales de la plataforma.

Los huertos, visitas, programas y demás actividades relacionadas con beneficiarios deberán poder vincularse con una familia registrada.

## RN-007 — Integrantes de una familia

Todo integrante registrado deberá encontrarse asociado con una familia existente.

Una familia podrá contener uno o varios integrantes.

## RN-008 — Comunidad

Cada familia deberá poder asociarse con una comunidad.

La comunidad deberá encontrarse registrada antes de realizar la asociación.

## RN-009 — Participación en programas

Una familia podrá participar en uno o más programas institucionales.

La asociación entre la familia y los programas deberá conservarse independientemente de las demás actividades realizadas con la familia.

## RN-010 — Estado de la familia

Las familias podrán encontrarse en uno de los siguientes estados:

- activa;
- retirada;
- egresada.

El cambio de estado de una familia no deberá eliminar su información histórica.

## RN-011 — Familias inactivas

Las familias retiradas o egresadas podrán ser consultadas para fines históricos.

Los nuevos registros operativos deberán realizarse principalmente sobre familias activas, salvo que el usuario autorizado determine que se requiere registrar información histórica.

---

# 5. Gestión agrícola

## RN-012 — Asociación de huertos

Todo huerto deberá estar asociado con una familia existente.

Una familia podrá poseer uno o varios huertos.

## RN-013 — Asociación de cultivos

Todo cultivo registrado dentro de la gestión agrícola deberá encontrarse asociado con un huerto.

Un huerto podrá contener diferentes cultivos.

## RN-014 — Registro de siembra o trasplante

Un registro de establecimiento de cultivo deberá indicar como mínimo:

- cultivo;
- fecha de siembra o trasplante;
- cantidad establecida.

Las cantidades registradas deberán ser mayores que cero.

## RN-015 — Producción agrícola

Toda producción registrada deberá relacionarse con el cultivo correspondiente.

Un registro de producción deberá indicar una cantidad y una unidad de medida.

La cantidad producida no podrá ser negativa.

## RN-016 — Unidades de medida

Las cantidades de producción deberán utilizar unidades de medida previamente definidas para evitar registros inconsistentes.

## RN-017 — Ventas e ingresos

Cuando una producción genere una venta, el sistema podrá registrar información de la venta y un ingreso aproximado.

Los valores monetarios no podrán ser negativos.

## RN-018 — Plagas y enfermedades

Las plagas y enfermedades deberán registrarse asociadas con un cultivo existente.

## RN-019 — Porcentaje de daño

Cuando se registre un porcentaje de daño relacionado con una plaga o enfermedad, el valor deberá encontrarse entre 0 y 100.

## RN-020 — Tratamientos

Los tratamientos aplicados deberán vincularse con el registro de la plaga o enfermedad que originó la intervención cuando corresponda.

## RN-021 — Entrega de insumos

Toda entrega de insumos agrícolas deberá estar asociada con una familia.

El registro deberá permitir identificar como mínimo:

- insumo entregado;
- cantidad;
- fecha de entrega;
- familia beneficiaria.

La cantidad entregada deberá ser mayor que cero.

---

# 6. Visitas y asistencia técnica

## RN-022 — Asociación de visitas

Toda visita de campo deberá estar asociada con:

- una familia;
- un trabajador responsable.

## RN-023 — Estados de una visita

Las visitas podrán manejar, como mínimo, los siguientes estados:

- planificada;
- realizada;
- cancelada.

Una visita planificada podrá posteriormente registrarse como realizada o cancelada.

## RN-024 — Resultados de visitas

Los resultados de una visita únicamente deberán registrarse para una visita realizada.

## RN-025 — Evaluación de huertos

Una evaluación realizada durante una visita deberá estar asociada con un huerto perteneciente a la misma familia relacionada con la visita.

Esta regla evita registrar accidentalmente una evaluación sobre el huerto de otra familia.

## RN-026 — Recomendaciones técnicas

Las recomendaciones técnicas deberán relacionarse con una visita o asistencia técnica realizada.

Una visita podrá generar ninguna, una o varias recomendaciones.

## RN-027 — Fechas de seguimiento

Cuando se establezca una fecha de seguimiento para una recomendación, esta no deberá ser anterior a la fecha en que fue emitida la recomendación.

---

# 7. Capacitaciones

## RN-028 — Registro de capacitaciones

Toda capacitación registrada deberá contener como mínimo:

- tema;
- fecha;
- facilitador.

## RN-029 — Participantes

Una capacitación podrá contener uno o varios participantes.

Los participantes deberán quedar asociados con la capacitación correspondiente.

## RN-030 — Conservación de capacitaciones

Las capacitaciones realizadas deberán conservarse como parte del historial institucional y no deberán eliminarse únicamente porque su fecha haya pasado.

---

# 8. Funcionamiento sin conexión

## RN-031 — Alcance del modo sin conexión

El funcionamiento sin conexión estará orientado principalmente a las actividades realizadas durante el trabajo de campo.

La captura offline podrá utilizarse para información operativa como:

- visitas;
- evaluaciones;
- recomendaciones;
- producción u otros registros agrícolas necesarios durante las visitas.

Las funciones administrativas que requieran información actualizada del servidor podrán requerir conexión a Internet.

## RN-032 — Almacenamiento local

Cuando no exista conexión, los registros deberán almacenarse temporalmente en el dispositivo hasta que puedan sincronizarse con el servidor.

## RN-033 — Estado de sincronización

Los registros creados sin conexión deberán mantener un estado de sincronización.

Como mínimo podrán identificarse los estados:

- pendiente;
- sincronizado;
- error.

## RN-034 — Identificador único

Los registros creados sin conexión deberán contar con un identificador que permita reconocerlos durante la sincronización y evitar que el mismo registro sea creado más de una vez.

## RN-035 — Sincronización

Cuando se restablezca la conexión, el sistema deberá permitir enviar al servidor los registros pendientes.

Una sincronización exitosa deberá actualizar el estado local del registro.

## RN-036 — Sin duplicación por sincronización

La repetición de una operación de sincronización no deberá crear múltiples copias del mismo registro.

## RN-037 — Error de sincronización

Si un registro no puede sincronizarse, deberá conservarse localmente y marcarse con un estado de error o pendiente para permitir un nuevo intento.

La información no deberá eliminarse debido a una sincronización fallida.

---

# 9. Reportes e indicadores

## RN-038 — Información utilizada en reportes

Los reportes deberán generarse utilizando únicamente información registrada en la plataforma.

## RN-039 — Filtrado

Los reportes deberán permitir aplicar filtros según la naturaleza de la información.

Entre los filtros podrán utilizarse:

- rango de fechas;
- familia;
- comunidad;
- programa;
- estado.

No todos los reportes deberán utilizar necesariamente todos los filtros.

## RN-040 — Indicadores básicos

La versión deberá mostrar como mínimo indicadores relacionados con:

- familias atendidas;
- familias activas;
- huertos activos.

Los indicadores adicionales dependerán de la información disponible en cada módulo.

## RN-041 — Exportación de información

Los resultados de los reportes deberán poder exportarse a Excel.

La versión definitiva también contemplará la generación de los reportes definidos en formato PDF.

---

# 10. Usuarios, roles y permisos

## RN-042 — Autenticación

Las funciones protegidas del sistema únicamente podrán utilizarse después de que el usuario se haya autenticado correctamente.

## RN-043 — Identificación de usuarios

Cada cuenta deberá poseer un identificador único que permita distinguirla del resto de usuarios.

No deberán existir dos cuentas activas con el mismo identificador de acceso.

## RN-044 — Roles

Todo usuario deberá poseer al menos un rol que determine las funciones a las que puede acceder.

## RN-045 — Permisos

La disponibilidad de las funcionalidades deberá depender de los permisos asociados con el usuario o con sus roles.

La existencia de una ruta o función en el sistema no implica que todos los usuarios puedan utilizarla.

## RN-046 — Usuarios desactivados

Un usuario desactivado deberá conservarse para mantener la trazabilidad de las operaciones realizadas anteriormente.

Un usuario desactivado no podrá iniciar una nueva sesión.

## RN-047 — Cierre de sesión

Cuando un usuario cierre sesión, deberá finalizarse el acceso autenticado correspondiente.

---

# 11. Auditoría

## RN-048 — Operaciones auditables

El sistema deberá registrar las operaciones que sean relevantes para la trazabilidad institucional.

Entre ellas podrán encontrarse:

- creación de registros;
- modificación de información;
- cambio de estado;
- operaciones administrativas relevantes.

## RN-049 — Datos mínimos de auditoría

Un registro de auditoría deberá permitir identificar, cuando corresponda:

- usuario;
- fecha y hora;
- tipo de operación;
- entidad afectada;
- registro afectado.

## RN-050 — Integridad de la bitácora

Los registros de auditoría no deberán ser modificados por usuarios operativos.

---

# 12. Alcance funcional definitivo

La versión que será desarrollada estará compuesta por los requerimientos clasificados como P0 y P1.

## 12.1 Familias y beneficiarios

Se incluyen:

- registro de familias;
- registro de integrantes;
- actualización de información;
- comunidades;
- programas institucionales;
- estados de familias;
- historial de actividades.

Requerimientos relacionados:

`RF-001` a `RF-007`.

## 12.2 Gestión agrícola

Se incluyen:

- huertos;
- cultivos;
- siembras y trasplantes;
- producción;
- unidades de medida;
- ventas e ingresos aproximados;
- plagas y enfermedades;
- porcentajes de daño;
- tratamientos;
- insumos agrícolas;
- historial agrícola.

Requerimientos relacionados:

`RF-008` a `RF-017`.

## 12.3 Visitas, asistencia técnica y capacitaciones

Se incluyen:

- planificación de visitas;
- asociación de familias y responsables;
- resultados de visitas;
- evaluaciones de huertos;
- recomendaciones;
- seguimiento;
- capacitaciones;
- facilitadores;
- participantes.

Requerimientos relacionados:

`RF-018` a `RF-025`.

## 12.4 Funcionamiento sin conexión

Se incluyen:

- captura de información de campo sin conexión;
- almacenamiento temporal;
- identificación de registros pendientes;
- sincronización;
- control del estado de sincronización.

Requerimientos relacionados:

`RF-026` a `RF-030`.

## 12.5 Reportes e indicadores

Se incluyen:

- reportes;
- filtros;
- indicadores institucionales;
- indicadores de familias y huertos;
- indicadores agrícolas;
- exportación a Excel;
- generación de reportes PDF.

Requerimientos relacionados:

`RF-031` a `RF-035`, `RF-038` y `RF-039`.

## 12.6 Usuarios, roles, permisos y auditoría

Se incluyen:

- creación de usuarios;
- actualización;
- desactivación;
- roles;
- permisos;
- autenticación;
- registro de operaciones;
- consulta de bitácora.

Requerimientos relacionados:

`RF-041` a `RF-048`, excepto `RF-049`.

---

# 13. Funcionalidades fuera del alcance de esta versión

Los siguientes requerimientos se encuentran registrados en la línea base, pero no serán desarrollados en esta versión.

| ID | Funcionalidad | Motivo |
|---|---|---|
| RF-036 | Generación automática de alertas de actividades pendientes | Funcionalidad complementaria clasificada como P2. |
| RF-037 | Identificación automática de registros incompletos | Funcionalidad complementaria clasificada como P2. |
| RF-040 | Comparación de información correspondiente a diferentes periodos | Funcionalidad analítica clasificada como P2. |
| RF-049 | Filtros avanzados de auditoría por usuario, fecha y operación | Funcionalidad complementaria clasificada como P2. |

Estas funcionalidades podrán considerarse en una futura iteración de la plataforma.

---

# 14. Otros elementos fuera del alcance

También quedan explícitamente fuera del alcance de esta versión:

- módulo de voluntariados;
- aplicación móvil nativa independiente;
- sistema de contabilidad completo;
- gestión de nómina;
- gestión de donaciones;
- tienda o comercio electrónico;
- portal público para beneficiarios;
- integraciones con sistemas externos no contempladas en los requerimientos;
- notificaciones mediante SMS, WhatsApp o correo electrónico;
- funcionalidades adicionales de inteligencia artificial no definidas dentro de los requerimientos aprobados.

La plataforma será desarrollada como una aplicación web progresiva (PWA), por lo que no se desarrollará una aplicación Android o iOS nativa independiente.

---

# 15. Requerimientos no funcionales dentro del alcance

Todos los requerimientos no funcionales RNF-001 a RNF-023 continúan formando parte de la solución.

Los requerimientos clasificados como P0 deberán cumplirse durante la construcción del MVP.

Los clasificados como P1 deberán completarse antes de considerar terminada la versión definitiva.

Esto incluye aspectos relacionados con:

- seguridad;
- autenticación;
- permisos;
- usabilidad;
- adaptación móvil;
- rendimiento;
- sincronización;
- disponibilidad;
- integridad de datos;
- documentación;
- mantenibilidad.

---

# 16. Consistencia entre requerimientos y alcance

Se revisó la relación entre los requerimientos funcionales, no funcionales, reglas de negocio y alcance definido.

No se identificaron contradicciones que impidan continuar con el diseño y desarrollo.

Se identificaron requerimientos que expresan una misma necesidad desde perspectivas diferentes y que, por lo tanto, son complementarios.

Ejemplos:

| Requerimientos | Relación |
|---|---|
| RF-045 y RNF-002 | Ambos establecen control de acceso según roles y permisos. |
| RF-047 y RNF-004 | Ambos establecen la necesidad de trazabilidad mediante registro de operaciones. |
| RF-026 a RF-030 y RNF-012 | Definen el comportamiento del mecanismo de trabajo offline y sincronización. |
| RF-026 a RF-030 y RNF-014 a RNF-016 | Relacionan el funcionamiento del sistema con escenarios de conectividad irregular. |
| RF-029 y RNF-020 | La sincronización debe realizarse preservando la integridad de los registros. |

Estas relaciones no representan duplicaciones que deban eliminarse, debido a que los requerimientos funcionales establecen capacidades del sistema y los no funcionales establecen condiciones bajo las cuales dichas capacidades deberán operar.

---

# 17. Decisiones consolidadas

Como resultado de la revisión se establecen las siguientes decisiones:

1. Los requerimientos P0 constituyen el MVP.
2. Los requerimientos P0 y P1 constituyen el alcance definitivo de esta versión.
3. Los requerimientos P2 se excluyen de esta versión y quedan documentados como mejoras futuras.
4. El módulo de voluntariados permanece fuera del alcance.
5. La solución será una aplicación web progresiva.
6. El funcionamiento sin conexión estará orientado principalmente al trabajo de campo.
7. Los datos históricos no deberán eliminarse cuando sean necesarios para mantener trazabilidad.
8. Las relaciones entre familias, huertos, cultivos, visitas y demás entidades deberán preservar la integridad de la información.
9. El control de acceso se realizará mediante autenticación, roles y permisos.
10. La información capturada sin conexión deberá conservarse hasta completar correctamente su sincronización.
11. Los requerimientos P1 deberán completarse antes de considerar finalizada la versión definitiva.
12. Las funcionalidades fuera del alcance no deberán bloquear la entrega del sistema.

---

# 18. Uso del alcance durante el desarrollo

Este documento constituye la referencia para determinar si una funcionalidad pertenece o no a la versión actual del proyecto.

Cuando se proponga una nueva funcionalidad durante el desarrollo deberá verificarse si:

1. ya se encuentra contemplada por un requerimiento existente;
2. corresponde a alguna regla de negocio documentada;
3. forma parte del alcance definitivo;
4. requiere modificar el alcance aprobado.

Las funcionalidades que no se encuentren contempladas deberán documentarse antes de incorporarse al desarrollo.

Esto permite prevenir crecimiento no controlado del alcance y mantener la planificación estable durante los sprints restantes.

---

# 19. Estado de criterios de aceptación

| Criterio | Estado |
|---|---|
| Las principales reglas de negocio están documentadas | Completado |
| Cada regla está asociada con el módulo correspondiente | Completado |
| Se encuentran claramente identificadas las funcionalidades incluidas | Completado |
| Se encuentran identificadas las funcionalidades fuera del alcance | Completado |
| No existen contradicciones evidentes entre alcance y requerimientos | Completado |
| El alcance definitivo puede utilizarse como referencia durante el desarrollo | Completado |

---

# 20. Resultado

Las reglas de negocio y el alcance definitivo de la plataforma han sido consolidados tomando como referencia los requerimientos definidos y la priorización previamente realizada.

El documento deberá utilizarse como entrada para:

- diseño del modelo de datos;
- elaboración del diagrama entidad-relación;
- definición de historias de usuario;
- diseño de endpoints;
- diseño de interfaces;
- elaboración de casos de prueba;
- control del alcance durante los siguientes sprints.

Cualquier modificación futura deberá documentarse para mantener la trazabilidad entre el requerimiento original, la regla de negocio y la implementación.