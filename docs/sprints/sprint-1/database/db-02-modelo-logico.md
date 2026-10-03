# DB-02 — Elaboración del modelo lógico

## 1. Objetivo

Construir el modelo lógico de la base de datos de Viviendas León a partir de las entidades, atributos y relaciones identificadas previamente, estableciendo claves primarias, claves foráneas, cardinalidades y claves candidatas.

El modelo representa los procesos incluidos dentro del alcance actual de la plataforma, principalmente familias y beneficiarios, gestión agrícola, producción, ventas, visitas, evaluaciones, asistencia técnica, capacitaciones, insumos, alertas, usuarios, permisos y auditoría.

---

## 2. Tablas lógicas definidas

El modelo lógico quedó organizado en las siguientes áreas.

### Ubicación

- `municipio`
- `comunidad`

### Familias y beneficiarios

- `familia`
- `integrante_familia`

### Programas

- `programa`
- `familia_programa`

### Gestión agrícola

- `huerto`
- `cultivo`
- `etapa_cultivo`
- `ciclo_cultivo`

### Producción agrícola

- `registro_produccion`
- `detalle_produccion`

### Ventas

- `registro_venta`
- `precio_venta`

### Catálogos generales

- `unidad_medida`
- `moneda`

### Visitas

- `visita`
- `condicion_climatica`

### Evaluaciones agrícolas

- `evaluacion_cultivo`
- `calidad`

### Enfermedades

- `enfermedad`
- `evaluacion_enfermedad`

### Plagas

- `plaga`
- `evaluacion_plaga`

### Insumos y tratamientos

- `categoria_insumo`
- `insumo`
- `tratamiento_aplicado`

### Entrega de insumos

- `entrega_insumo`
- `detalle_entrega_insumo`

### Asistencia técnica

- `seguimiento_tecnico`

### Capacitaciones

- `capacitacion`
- `participacion_capacitacion`

### Evidencias

- `evidencia`
- `visita_evidencia`
- `evaluacion_evidencia`
- `capacitacion_evidencia`

### Alertas

- `alerta`

### Usuarios y seguridad

- `usuario`
- `rol`
- `permiso`
- `usuario_rol`
- `rol_permiso`

### Auditoría

- `bitacora`

---

## 3. Relaciones y cardinalidades

Las relaciones principales del modelo lógico son las siguientes:

| Entidad origen | Cardinalidad | Entidad destino |
|---|---|---|
| Municipio | 1:N | Comunidad |
| Comunidad | 1:N | Familia |
| Familia | 1:N | Integrante de familia |
| Familia | N:M | Programa |
| Familia | 1:N | Huerto |
| Huerto | 1:N | Ciclo de cultivo |
| Cultivo | 1:N | Ciclo de cultivo |
| Ciclo de cultivo | 1:N | Registro de producción |
| Registro de producción | 1:N | Detalle de producción |
| Registro de producción | 1:N | Registro de venta |
| Registro de venta | 1:N | Precio de venta |
| Familia | 1:N | Visita |
| Usuario | 1:N | Visita |
| Condición climática | 1:N | Visita |
| Visita | 1:N | Evaluación de cultivo |
| Ciclo de cultivo | 1:N | Evaluación de cultivo |
| Etapa de cultivo | 1:N | Evaluación de cultivo |
| Calidad | 1:N | Evaluación de cultivo |
| Evaluación de cultivo | N:M | Enfermedad |
| Evaluación de cultivo | N:M | Plaga |
| Evaluación de cultivo | 1:N | Tratamiento aplicado |
| Categoría de insumo | 1:N | Insumo |
| Insumo | 1:N | Tratamiento aplicado |
| Familia | 1:N | Entrega de insumo |
| Entrega de insumo | 1:N | Detalle de entrega |
| Insumo | 1:N | Detalle de entrega |
| Evaluación de cultivo | 1:N | Seguimiento técnico |
| Comunidad | 1:N | Capacitación |
| Capacitación | N:M | Integrante de familia |
| Usuario | N:M | Rol |
| Rol | N:M | Permiso |
| Usuario | 1:N | Bitácora |

Las relaciones de muchos a muchos se resuelven mediante tablas asociativas.

---

## 4. Tablas asociativas

Las principales tablas asociativas definidas son:

- `familia_programa`
- `evaluacion_enfermedad`
- `evaluacion_plaga`
- `participacion_capacitacion`
- `usuario_rol`
- `rol_permiso`
- `visita_evidencia`
- `evaluacion_evidencia`
- `capacitacion_evidencia`

Estas tablas permiten representar relaciones N:M sin almacenar múltiples valores dentro de una misma entidad.

---

## 5. Claves candidatas

Además de las claves primarias identificadas mediante `id`, se definieron claves candidatas o restricciones únicas para evitar duplicidad en determinados catálogos y registros.

Las principales son:

- `municipio.nombre`
- combinación `comunidad(municipio_id, nombre)`
- `programa.nombre`
- `cultivo.nombre`
- `etapa_cultivo.nombre`
- `condicion_climatica.nombre`
- `calidad.nombre`
- `enfermedad.nombre`
- `plaga.nombre`
- `categoria_insumo.nombre`
- `unidad_medida.codigo`
- `moneda.codigo`
- `usuario.correo`
- `rol.nombre`
- `permiso.codigo`

También se definieron combinaciones únicas dentro de tablas asociativas para impedir relaciones duplicadas.

---

## 6. Decisiones de diseño

### Ciclo de cultivo

Se utiliza `ciclo_cultivo` para representar un cultivo específico dentro de un huerto durante un periodo determinado.

Esto permite mantener separados:

- el catálogo general de cultivos;
- las siembras realizadas;
- las fechas;
- la cantidad de plantas;
- el historial de producción;
- las evaluaciones posteriores.

---

### Producción agrícola

La producción se divide entre:

- `registro_produccion`;
- `detalle_produccion`.

Esto permite registrar una misma producción utilizando distintas unidades de medida sin crear columnas específicas para cada unidad.

---

### Ventas

Las ventas se separan de la producción mediante:

- `registro_venta`;
- `precio_venta`.

Esto permite registrar cantidades vendidas y precios en diferentes monedas sin mezclar información productiva con información económica.

---

### Evaluaciones agrícolas

La entidad `evaluacion_cultivo` relaciona una visita con un ciclo de cultivo específico.

A partir de una evaluación se pueden registrar:

- calidad;
- etapa del cultivo;
- enfermedades;
- plagas;
- tratamientos;
- seguimientos técnicos;
- evidencias.

---

### Seguimiento técnico

`seguimiento_tecnico` se relaciona directamente con `evaluacion_cultivo`.

No se almacena nuevamente `visita_id`, ya que la visita puede obtenerse mediante:

`seguimiento_tecnico -> evaluacion_cultivo -> visita`

---

### Evidencias

Las evidencias se almacenan como registros independientes y se relacionan mediante tablas asociativas.

Esto permite utilizar una estructura común para fotografías y documentos relacionados con:

- visitas;
- evaluaciones;
- capacitaciones.

---

### Catálogos

Los elementos reutilizables se mantienen como catálogos independientes.

Entre ellos:

- cultivos;
- etapas;
- enfermedades;
- plagas;
- calidad;
- clima;
- insumos;
- unidades de medida;
- monedas;
- roles;
- permisos.

Esto evita duplicidad y facilita la administración futura de nuevos valores.

---

## 7. Alcance representado

El modelo lógico contempla los módulos incluidos dentro del alcance actual:

- familias y beneficiarios;
- gestión agrícola;
- producción y ventas;
- visitas;
- asistencia técnica;
- capacitaciones;
- insumos;
- reportes e indicadores derivados;
- alertas;
- usuarios y permisos;
- auditoría;
- funcionamiento sin conexión mediante sincronización posterior.

El módulo de voluntariado no forma parte del alcance actual y no se incluyen tablas relacionadas con dicho módulo.

---

## 8. Resultado

El modelo lógico define las tablas, atributos, claves y relaciones necesarias para representar los requerimientos funcionales principales de Viviendas León.

Este modelo servirá como base para la normalización y posteriormente para la construcción del modelo físico en PostgreSQL y Prisma.

---

## 9. Criterios de aceptación

- [x] Existe un modelo lógico completo.
- [x] Las relaciones poseen cardinalidad.
- [x] Se identificaron claves primarias y foráneas.
- [x] Se identificaron claves candidatas.
- [x] El modelo representa los requerimientos funcionales incluidos dentro del alcance.