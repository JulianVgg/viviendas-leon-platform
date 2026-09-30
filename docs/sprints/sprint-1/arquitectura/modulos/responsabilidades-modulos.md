# Responsabilidades de los módulos

## 1. Objetivo

Establecer las responsabilidades de cada módulo de la plataforma Viviendas León, delimitando las funciones que corresponden a cada uno para evitar duplicación de responsabilidades y mantener una separación clara de las funciones del sistema.

## 2. Módulos de la plataforma

La plataforma estará organizada en los siguientes módulos:

- Familias y beneficiarios.
- Gestión agrícola.
- Visitas y asistencia técnica.
- Capacitaciones.
- Reportes e indicadores.
- Usuarios, roles y seguridad.

El módulo de voluntariado queda fuera del alcance actual de la plataforma.

---

## 3. Familias y beneficiarios

### Responsabilidad

Administrar la información básica de las familias beneficiarias y de sus integrantes.

### Funciones principales

- Registrar familias beneficiarias.
- Registrar los integrantes o beneficiarios asociados a una familia.
- Actualizar la información de las familias y sus integrantes.
- Asociar familias con comunidades.
- Asociar familias con programas institucionales.
- Gestionar el estado de las familias.
- Consultar el historial general asociado a una familia.

### Fuera de su responsabilidad

Este módulo no será responsable de:

- Administrar huertos o cultivos.
- Registrar producción agrícola.
- Registrar visitas de campo.
- Administrar capacitaciones.
- Generar reportes globales.

---

## 4. Gestión agrícola

### Responsabilidad

Administrar la información relacionada con las actividades y resultados agrícolas de las familias beneficiarias.

### Funciones principales

- Registrar y administrar huertos.
- Registrar cultivos.
- Registrar fechas de siembra o trasplante.
- Registrar cantidades establecidas.
- Registrar producción agrícola.
- Registrar unidades de medida.
- Registrar ventas e ingresos aproximados.
- Registrar plagas y enfermedades.
- Registrar porcentajes de daño.
- Registrar tratamientos aplicados.
- Registrar insumos agrícolas entregados.
- Consultar el historial agrícola de una familia.

### Fuera de su responsabilidad

Este módulo no será responsable de:

- Administrar la información general de las familias.
- Administrar usuarios, roles o permisos.
- Generar reportes globales del sistema.
- Administrar capacitaciones.

---

## 5. Visitas y asistencia técnica

### Responsabilidad

Administrar la planificación, ejecución y seguimiento de las visitas de campo y de las actividades de asistencia técnica realizadas a las familias.

### Funciones principales

- Planificar visitas de campo.
- Asignar responsables a las visitas.
- Asociar visitas con familias.
- Registrar los resultados de las visitas.
- Registrar evaluaciones realizadas durante las visitas.
- Registrar recomendaciones de asistencia técnica.
- Registrar fechas de seguimiento.
- Registrar evidencias relacionadas con las visitas cuando corresponda.

### Fuera de su responsabilidad

Este módulo no será responsable de:

- Administrar directamente la información de las familias.
- Administrar los datos estructurales de los huertos o cultivos.
- Administrar usuarios, roles o permisos.
- Generar reportes globales.

---

## 6. Capacitaciones

### Responsabilidad

Administrar las actividades de capacitación realizadas por la organización y la información relacionada con sus participantes.

### Funciones principales

- Registrar capacitaciones.
- Registrar el tema de una capacitación.
- Registrar fecha y lugar cuando corresponda.
- Registrar facilitadores.
- Registrar participantes.
- Registrar resultados y observaciones.
- Asociar participantes con las familias correspondientes.

### Fuera de su responsabilidad

Este módulo no será responsable de:

- Administrar la información general de las familias.
- Administrar actividades agrícolas.
- Administrar usuarios, roles o permisos.
- Generar reportes globales.

---

## 7. Reportes e indicadores

### Responsabilidad

Consolidar y presentar información proveniente de los módulos funcionales para facilitar el seguimiento, análisis y consulta de la información registrada en la plataforma.

### Funciones principales

- Generar reportes.
- Consultar información mediante filtros.
- Presentar indicadores.
- Generar alertas basadas en información registrada.
- Comparar información entre diferentes periodos.
- Exportar información a Excel.
- Generar documentos PDF.
- Presentar información consolidada de familias, actividades agrícolas, visitas y capacitaciones.

### Fuera de su responsabilidad

Este módulo no será responsable de:

- Registrar o modificar directamente la información operativa de otros módulos.
- Administrar familias.
- Administrar huertos o cultivos.
- Registrar visitas.
- Administrar capacitaciones.
- Administrar usuarios o permisos.

El módulo de reportes utilizará la información de los demás módulos principalmente para consulta, consolidación y generación de resultados.

---

## 8. Usuarios, roles y seguridad

### Responsabilidad

Administrar el acceso a la plataforma y los mecanismos relacionados con autenticación, autorización, permisos y trazabilidad de las operaciones.

### Funciones principales

- Crear usuarios.
- Actualizar usuarios.
- Desactivar usuarios.
- Asignar roles.
- Gestionar permisos.
- Autenticar usuarios.
- Autorizar operaciones según los permisos asignados.
- Registrar operaciones relevantes.
- Consultar la bitácora de auditoría.
- Filtrar registros de auditoría.

### Roles contemplados

- Trabajador de campo.
- Coordinación.
- Dirección operativa.
- Administración.
- Auditoría.

### Fuera de su responsabilidad

Este módulo no será responsable de:

- Administrar familias.
- Administrar información agrícola.
- Registrar visitas.
- Administrar capacitaciones.
- Generar reportes funcionales.

---

## 9. Regla general de responsabilidades

Cada módulo será responsable únicamente de la información y reglas de negocio correspondientes a su dominio funcional.

Un módulo podrá utilizar información de otro módulo mediante las interfaces o servicios definidos, pero no deberá duplicar la lógica de negocio ni administrar directamente información que pertenezca a otro módulo.

Esta separación permite mantener responsabilidades claras dentro del monolito modular y facilita el mantenimiento y evolución de la plataforma.