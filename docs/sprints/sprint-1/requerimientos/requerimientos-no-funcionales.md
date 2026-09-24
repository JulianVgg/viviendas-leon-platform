# Requerimientos no funcionales

## 1. Seguridad

| ID | Requerimiento |
|---|---|
| RNF-001 | El sistema deberá requerir autenticación para acceder a las funciones protegidas. |
| RNF-002 | El sistema deberá restringir las funcionalidades según el rol y permisos asignados al usuario. |
| RNF-003 | El sistema deberá proteger la información institucional frente a accesos no autorizados. |
| RNF-004 | El sistema deberá registrar las operaciones relevantes realizadas por los usuarios para mantener trazabilidad. |
| RNF-005 | La comunicación entre el cliente y el servidor deberá realizarse mediante conexiones seguras. |

## 2. Usabilidad

| ID | Requerimiento |
|---|---|
| RNF-006 | La interfaz deberá presentar información y controles de forma clara y comprensible para los usuarios. |
| RNF-007 | La interfaz deberá adaptarse a computadoras y dispositivos móviles. |
| RNF-008 | Los formularios deberán proporcionar mensajes claros cuando exista información inválida o incompleta. |
| RNF-009 | Las funciones utilizadas durante las visitas de campo deberán poder ejecutarse mediante una interfaz adecuada para dispositivos móviles. |

## 3. Rendimiento

| ID | Requerimiento |
|---|---|
| RNF-010 | El sistema deberá responder a las operaciones habituales de consulta y registro en un tiempo adecuado para el uso operativo. |
| RNF-011 | La generación de reportes deberá procesar la información solicitada sin bloquear las demás funciones del sistema. |
| RNF-012 | El mecanismo de sincronización deberá procesar los registros pendientes sin requerir que el usuario vuelva a ingresarlos manualmente. |

## 4. Disponibilidad y conectividad irregular

| ID | Requerimiento |
|---|---|
| RNF-013 | La plataforma deberá permitir el acceso a la información desde las ubicaciones autorizadas mediante conexión a Internet. |
| RNF-014 | Las funciones de captura de información de campo deberán contemplar interrupciones temporales de conectividad. |
| RNF-015 | La pérdida temporal de conexión no deberá provocar la pérdida de los datos registrados localmente. |
| RNF-016 | El sistema deberá permitir la recuperación de los registros pendientes después del restablecimiento de la conectividad. |

## 5. Integridad y consistencia de datos

| ID | Requerimiento |
|---|---|
| RNF-017 | El sistema deberá validar los datos antes de almacenarlos. |
| RNF-018 | El sistema deberá mantener relaciones consistentes entre familias, beneficiarios, huertos, cultivos, visitas y demás registros asociados. |
| RNF-019 | El sistema deberá evitar la creación de registros duplicados cuando corresponda. |
| RNF-020 | Las operaciones de sincronización deberán preservar la integridad de los registros almacenados. |

## 6. Mantenibilidad y documentación

| ID | Requerimiento |
|---|---|
| RNF-021 | El sistema deberá contar con documentación técnica suficiente para facilitar su mantenimiento. |
| RNF-022 | El sistema deberá contar con documentación de usuario para las funciones principales. |
| RNF-023 | La solución deberá mantener una estructura modular que facilite la incorporación o modificación de funcionalidades. |
