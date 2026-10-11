# AUTH-01 — Matriz de roles y permisos

## 1. Objetivo y alcance

Definir quién puede consultar, crear, modificar, eliminar, administrar o exportar información en la plataforma web de ViviendasLeón. La presente tarea documenta las reglas de autorización; **no implementa** autenticación, endpoints, migraciones ni interfaz.

Las familias/beneficiarios son registros del programa y **no son usuarios** de la aplicación.

## 2. Roles

| Identificador sugerido | Rol | Alcance |
|---|---|---|
| `DIRECTORA` | Directora | Acceso funcional completo; gestiona usuarios, restablecimiento de contraseñas, roles y permisos. |
| `COORDINADORA` | Coordinadora | Acceso funcional completo a módulos operativos y administrativos, excepto gestión de usuarios, credenciales, roles y permisos. |
| `PERSONAL_CAMPO` | Personal de campo | Registra y consulta información de trabajo en campo, capacitaciones e insumos; edita registros autorizados. |
| `CONTADORA` | Contadora | Control contable: consulta entregas de insumos y gestiona registros de gastos/reportes financieros, sujetos a disponibilidad del módulo. |
| `AUDITOR` | Auditor | Revisión y exportación de información autorizada; acceso de solo lectura, incluida bitácora. |

## 3. Convenciones

- **SÍ:** acción permitida.
- **NO:** acción denegada.
- **LIMITADO:** acción permitida solo dentro del alcance asignado (por ejemplo, registros propios/asignados o reportes relacionados).
- **LECTURA:** acceso exclusivamente de consulta; no autoriza crear, editar, eliminar ni aprobar.
- Los permisos listados representan **reglas de negocio previstas**; no afirman que los módulos estén implementados actualmente.

## 4. Matriz detallada por módulo

| Módulo / acción | Directora | Coordinadora | Personal de campo | Contadora | Auditor |
|---|---|---|---|---|---|
| **Familias y beneficiarios** | | | | | |
| Consultar familias | SÍ | SÍ | SÍ | LIMITADO | LECTURA |
| Registrar familias | SÍ | SÍ | SÍ | NO | NO |
| Editar familias | SÍ | SÍ | LIMITADO | NO | NO |
| Eliminar o desactivar familias | SÍ | SÍ | NO | NO | NO |
| **Huertos y cultivos** | | | | | |
| Consultar huertos y cultivos | SÍ | SÍ | SÍ | NO | LECTURA |
| Registrar huertos | SÍ | SÍ | SÍ | NO | NO |
| Registrar y actualizar cultivos | SÍ | SÍ | SÍ | NO | NO |
| **Visitas, evaluaciones y seguimiento** | | | | | |
| Consultar visitas y evaluaciones | SÍ | SÍ | SÍ | NO | LECTURA |
| Registrar visitas | SÍ | SÍ | SÍ | NO | NO |
| Editar visitas | SÍ | SÍ | LIMITADO | NO | NO |
| Registrar evaluaciones y seguimiento | SÍ | SÍ | SÍ | NO | NO |
| Consultar monitoreo | SÍ | SÍ | SÍ | NO | LECTURA |
| **Capacitaciones** | | | | | |
| Crear y programar capacitaciones | SÍ | SÍ | SÍ | NO | NO |
| Registrar capacitaciones realizadas | SÍ | SÍ | SÍ | NO | NO |
| Registrar participantes y asistencia | SÍ | SÍ | SÍ | NO | NO |
| Consultar capacitaciones | SÍ | SÍ | SÍ | NO | LECTURA |
| Editar capacitaciones | SÍ | SÍ | LIMITADO | NO | NO |
| **Insumos entregados** | | | | | |
| Registrar entregas de insumos | SÍ | SÍ | SÍ | NO | NO |
| Consultar entregas e historial | SÍ | SÍ | SÍ | SÍ | LECTURA |
| Editar entregas | SÍ | SÍ | LIMITADO | NO | NO |
| Anular/corregir entregas auditadas | SÍ | SÍ | NO | NO | NO |
| **Contabilidad** (si se implementa) | | | | | |
| Consultar gastos y movimientos | SÍ | SÍ | NO | SÍ | LECTURA |
| Registrar y editar gastos | SÍ | SÍ | NO | SÍ | NO |
| Consultar reportes financieros | SÍ | SÍ | NO | SÍ | LECTURA |
| **Reportes** | | | | | |
| Consultar/generar reportes generales | SÍ | SÍ | LIMITADO | LIMITADO | LECTURA |
| Exportar reportes autorizados | SÍ | SÍ | LIMITADO | LIMITADO | SÍ |
| **Usuarios y seguridad** | | | | | |
| Crear, editar, activar/desactivar usuarios | SÍ | NO | NO | NO | NO |
| Restablecer contraseñas de otras personas | SÍ | NO | NO | NO | NO |
| Crear, modificar y asignar roles | SÍ | NO | NO | NO | NO |
| Administrar permisos | SÍ | NO | NO | NO | NO |
| **Auditoría** | | | | | |
| Consultar bitácora de cambios | SÍ | SÍ | NO | LIMITADO | LECTURA |
| Exportar bitácora autorizada | SÍ | SÍ | NO | LIMITADO | SÍ |


## 5. Reglas de autorización y seguridad

1. **Denegar por defecto:** Toda acción que no esté autorizada explícitamente en la matriz de permisos será rechazada.

2. **Validación de permisos:** Los permisos deberán verificarse desde el backend, según el rol y el alcance asignado a cada usuario.

3. **Administración de usuarios:** Únicamente la Directora podrá crear, modificar o desactivar usuarios, así como administrar roles y permisos.

4. **Acceso limitado:** El personal de campo y la Contadora tendrán acceso únicamente a la información y funcionalidades relacionadas con sus responsabilidades.

5. **Auditoría:** El Auditor podrá consultar y exportar información autorizada, sin modificar ni eliminar registros.

6. **Seguridad y trazabilidad:** Las operaciones relevantes deberán registrar el usuario responsable, la fecha y la acción realizada.

7. **Operaciones sin conexión:** Los registros creados sin conexión deberán validar nuevamente los permisos del usuario al sincronizarse con el servidor.
