# Dependencias entre módulos

## 1. Objetivo

Documentar las dependencias permitidas entre los módulos de la plataforma Viviendas León, estableciendo cómo pueden interactuar entre sí y evitando dependencias innecesarias o circulares.

## 2. Módulos

La plataforma estará organizada en los siguientes módulos:

- Familias y beneficiarios.
- Gestión agrícola.
- Visitas y asistencia técnica.
- Capacitaciones.
- Reportes e indicadores.
- Usuarios, roles y seguridad.

El módulo de voluntariado queda fuera del alcance actual.

---

## 3. Principios de dependencia

Las dependencias entre módulos deberán cumplir las siguientes reglas:

1. Cada módulo debe mantener la responsabilidad de su propio dominio funcional.
2. Un módulo podrá consultar información de otro cuando exista una relación funcional justificada.
3. Los módulos no deberán duplicar información ni lógica de negocio perteneciente a otro módulo.
4. Los módulos no deberán acceder directamente a las tablas internas de otro módulo.
5. La comunicación entre módulos deberá realizarse mediante servicios, interfaces o mecanismos definidos por la aplicación.
6. Las dependencias deberán mantenerse en una sola dirección siempre que sea posible.
7. Se deberán evitar dependencias circulares entre módulos.
8. El módulo de Reportes e indicadores tendrá principalmente dependencias de consulta hacia los módulos funcionales.
9. El módulo de Usuarios, roles y seguridad proporcionará servicios transversales de autenticación, autorización y auditoría.

---

## 4. Dependencias permitidas

| Módulo origen | Módulo dependiente | Tipo de dependencia | Justificación |
|---|---|---|---|
| Gestión agrícola | Familias y beneficiarios | Consulta / asociación | Los huertos y registros agrícolas deben estar asociados a una familia. |
| Visitas y asistencia técnica | Familias y beneficiarios | Consulta / asociación | Las visitas se realizan a familias beneficiarias. |
| Visitas y asistencia técnica | Gestión agrícola | Consulta / evaluación | Las visitas pueden registrar evaluaciones y seguimiento relacionados con huertos y actividades agrícolas. |
| Capacitaciones | Familias y beneficiarios | Consulta / asociación | Los participantes de las capacitaciones pueden estar asociados con familias beneficiarias. |
| Reportes e indicadores | Familias y beneficiarios | Consulta | Permite generar reportes e indicadores relacionados con familias y beneficiarios. |
| Reportes e indicadores | Gestión agrícola | Consulta | Permite generar indicadores y reportes relacionados con huertos, cultivos y producción. |
| Reportes e indicadores | Visitas y asistencia técnica | Consulta | Permite generar reportes sobre visitas, asistencia técnica y seguimiento. |
| Reportes e indicadores | Capacitaciones | Consulta | Permite generar reportes e indicadores sobre capacitaciones. |
| Módulos funcionales | Usuarios, roles y seguridad | Servicio transversal | Permite validar autenticación, autorización y permisos para las operaciones protegidas. |

---

## 5. Módulo Familias y beneficiarios

El módulo de Familias y beneficiarios se considera un módulo base para la información de las personas y familias atendidas.

### Dependencias

No depende de otros módulos funcionales.

### Puede ser utilizado por

- Gestión agrícola.
- Visitas y asistencia técnica.
- Capacitaciones.
- Reportes e indicadores.

### Representación

```text
                  Familias y beneficiarios
                     │       │       │
                     │       │       │
                     ▼       ▼       ▼
                Agricultura Visitas Capacitaciones
                     │       │       │
                     └───────┼───────┘
                             ▼
                       Reportes e
                       indicadores