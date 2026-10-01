# DB-01 — Identificación de entidades, atributos y relaciones

## 1. Objetivo

Definir las entidades principales del dominio de Viviendas León, sus atributos y las relaciones necesarias para representar la información utilizada por la plataforma.

El modelo busca centralizar la información actualmente distribuida entre hojas de cálculo, formularios digitales y registros de campo, manteniendo relaciones que permitan consultar el historial de las familias, huertos, cultivos, visitas, evaluaciones, producción, tratamientos, capacitaciones e insumos.

La presente definición corresponde al modelo lógico inicial. Los tipos de datos, restricciones físicas, índices, nombres definitivos de claves y demás decisiones específicas de PostgreSQL y Prisma se definirán posteriormente durante el diseño e implementación de la base de datos.

---

## 2. Entidades identificadas

### 2.1 Ubicación geográfica

#### Municipio

Representa el municipio en el que se encuentran las comunidades atendidas por Viviendas León.

Atributos:

- `id`
- `nombre`
- `activo`

Datos iniciales conocidos:

- Santa Lucía Utatlán

---

#### Comunidad

Representa las comunidades en las que Viviendas León desarrolla sus programas.

Atributos:

- `id`
- `municipio_id`
- `nombre`
- `activo`

Datos iniciales conocidos:

- Los Planes
- Paxub'
- Ciénaga Grande

---

## 2.2 Familias y beneficiarios

### Familia

Representa a cada familia beneficiaria atendida por Viviendas León.

Atributos:

- `id`
- `comunidad_id`
- `nombre_referencia`
- `fecha_ingreso`
- `estado`
- `observaciones`
- `activo`

Ejemplos de familias proporcionadas por la institución:

- Angélica Epifania García Yaxim
- Diana Elena Xitamul Cochoy de Saquic

El nombre de referencia permite identificar fácilmente a la familia, mientras que los datos particulares de cada persona se almacenarán mediante los integrantes de la familia.

---

### Integrante de familia

Representa a las personas que forman parte de una familia beneficiaria.

Atributos:

- `id`
- `familia_id`
- `nombre_completo`
- `fecha_nacimiento`
- `sexo`
- `parentesco`
- `telefono`
- `observaciones`
- `activo`

No todos los atributos deberán ser obligatorios, ya que dependerán de la información que la institución disponga de cada integrante.

---

### Programa

Representa los programas institucionales en los que puede participar una familia.

Atributos:

- `id`
- `nombre`
- `descripcion`
- `fecha_inicio`
- `fecha_fin`
- `estado`

---

### Familia programa

Entidad asociativa utilizada para relacionar una familia con uno o varios programas institucionales.

Atributos:

- `id`
- `familia_id`
- `programa_id`
- `fecha_ingreso`
- `fecha_salida`
- `estado`
- `observaciones`

---

## 2.3 Gestión agrícola

### Huerto

Representa cada huerto relacionado con una familia beneficiaria.

Atributos:

- `id`
- `familia_id`
- `nombre`
- `tipo`
- `fecha_inicio`
- `estado`
- `observaciones`

Una familia podrá tener uno o varios huertos a lo largo del tiempo.

---

### Cultivo

Catálogo que contiene las plantas o cultivos utilizados dentro de los huertos.

Atributos:

- `id`
- `nombre`
- `descripcion`
- `activo`

El cultivo funciona como catálogo general. Los datos específicos de un cultivo sembrado por una familia se almacenarán mediante la entidad `Ciclo de cultivo`.

---

### Etapa de cultivo

Catálogo utilizado para identificar la etapa de desarrollo en la que se encuentra un cultivo.

Atributos:

- `id`
- `nombre`
- `descripcion`
- `activo`

Valores iniciales:

- Almácigo
- Trasplantado

---

### Ciclo de cultivo

Representa la existencia de un cultivo específico dentro de un huerto durante determinado periodo.

Esta entidad permite diferenciar el catálogo general de cultivos de las siembras realizadas por cada familia.

Atributos:

- `id`
- `huerto_id`
- `cultivo_id`
- `etapa_cultivo_id`
- `fecha_siembra`
- `fecha_trasplante`
- `cantidad_plantas`
- `fecha_fin`
- `estado`
- `observaciones`

Por ejemplo, el cultivo `Tomate` podrá existir una sola vez en el catálogo, pero varias familias podrán tener diferentes ciclos de cultivo de tomate en diferentes fechas y huertos.

---

## 2.4 Producción agrícola

### Registro de producción

Representa los resultados productivos obtenidos de un ciclo de cultivo durante un periodo determinado.

Atributos:

- `id`
- `ciclo_cultivo_id`
- `fecha_inicio_periodo`
- `fecha_fin_periodo`
- `producto_por_planta_unidades`
- `producto_por_planta_kg`
- `total_produccion_unidades`
- `total_produccion_kg`
- `precio_venta_gtq`
- `precio_venta_usd`
- `total_venta_gtq`
- `total_venta_usd`
- `observaciones`

Esta entidad permite representar la información utilizada actualmente en los reportes de producciones agrícolas.

Entre los datos contemplados se encuentran:

- cantidad de plantas;
- producto obtenido por planta en unidades;
- producto obtenido por planta en kilogramos;
- producción total en unidades;
- producción total en kilogramos;
- precio de venta en quetzales;
- precio de venta en dólares;
- total de ventas en quetzales;
- total de ventas en dólares;
- observaciones.

Algunos valores, como los totales de venta, podrán calcularse automáticamente a partir de otros datos. La decisión sobre si se almacenarán físicamente o se calcularán durante las consultas se realizará durante el diseño físico de la base de datos.

---

## 2.5 Visitas de campo

### Visita

Representa una visita realizada por un trabajador de campo a una familia.

Atributos:

- `id`
- `familia_id`
- `usuario_responsable_id`
- `condicion_climatica_id`
- `fecha`
- `hora_inicio`
- `hora_fin`
- `tipo`
- `estado`
- `comentario`
- `observaciones`

Una visita puede incluir la revisión de uno o varios cultivos pertenecientes a la familia.

---

### Condición climática

Catálogo utilizado para registrar las condiciones climáticas observadas durante una visita.

Atributos:

- `id`
- `nombre`
- `activo`

Valores iniciales proporcionados:

- Claro
- Nublado
- Lluvia ligera
- Lluvia pesada
- Viento ligero
- Viento pesado

---

## 2.6 Evaluación de cultivos

### Evaluación de cultivo

Representa la evaluación realizada a un ciclo de cultivo durante una visita de campo.

Atributos:

- `id`
- `visita_id`
- `ciclo_cultivo_id`
- `etapa_cultivo_id`
- `calidad_id`
- `observaciones`

Una visita podrá contener varias evaluaciones, debido a que una familia puede tener distintos cultivos en un mismo huerto o en diferentes huertos.

La evaluación funcionará como punto de relación para enfermedades, plagas y tratamientos identificados durante la visita.

---

### Calidad

Catálogo utilizado para clasificar visual o técnicamente la condición del cultivo.

Atributos:

- `id`
- `nombre`
- `activo`

Valores iniciales:

- Excelente
- Bueno
- Regular/Medio
- Malo

---

## 2.7 Enfermedades

### Enfermedad

Catálogo de enfermedades que pueden identificarse durante la evaluación de un cultivo.

Atributos:

- `id`
- `nombre`
- `descripcion`
- `activo`

---

### Evaluación enfermedad

Entidad asociativa utilizada para registrar una o varias enfermedades identificadas en una evaluación.

Atributos:

- `id`
- `evaluacion_cultivo_id`
- `enfermedad_id`
- `porcentaje_danio`
- `observaciones`

El porcentaje de daño se almacenará como un valor numérico.

Los porcentajes utilizados actualmente son:

- 1 %
- 3 %
- 5 %
- 10 %
- 20 %

El modelo permitirá almacenar otros porcentajes en el futuro sin modificar la estructura de la base de datos.

---

## 2.8 Plagas

### Plaga

Catálogo de plagas que pueden identificarse en un cultivo.

Atributos:

- `id`
- `nombre`
- `descripcion`
- `activo`

---

### Evaluación plaga

Entidad asociativa utilizada para registrar una o varias plagas identificadas durante una evaluación.

Atributos:

- `id`
- `evaluacion_cultivo_id`
- `plaga_id`
- `porcentaje_danio`
- `observaciones`

Los porcentajes utilizados actualmente son:

- 1 %
- 3 %
- 5 %
- 10 %
- 20 %

Los porcentajes se almacenarán como valores numéricos y no como registros independientes dentro de un catálogo.

---

## 2.9 Insumos y tratamientos

### Categoría de insumo

Catálogo utilizado para clasificar los diferentes productos y recursos agrícolas utilizados por la organización.

Atributos:

- `id`
- `nombre`
- `descripcion`
- `activo`

Categorías iniciales propuestas:

- Insecticida orgánico
- Abono orgánico
- Producto químico
- Fertilizante
- Semilla
- Pilón
- Herramienta
- Otro

---

### Insumo

Representa un producto o recurso agrícola que puede entregarse a una familia o utilizarse como tratamiento.

Atributos:

- `id`
- `categoria_insumo_id`
- `nombre`
- `descripcion`
- `unidad_medida`
- `activo`

La misma entidad permitirá administrar productos orgánicos, químicos, fertilizantes, semillas, pilones, herramientas y otros recursos sin crear una tabla diferente para cada tipo.

---

### Tratamiento aplicado

Representa un producto utilizado como tratamiento sobre un cultivo evaluado.

Atributos:

- `id`
- `evaluacion_cultivo_id`
- `insumo_id`
- `fecha_aplicacion`
- `cantidad`
- `unidad_medida`
- `observaciones`

Los tratamientos aplicados se mantendrán separados de los insumos entregados a las familias.

Un tratamiento representa el uso de un producto sobre un cultivo determinado, mientras que una entrega de insumo representa la transferencia de recursos de Viviendas León hacia una familia.

---

## 2.10 Entrega de insumos

### Entrega de insumo

Representa una entrega realizada por Viviendas León a una familia beneficiaria.

Atributos:

- `id`
- `familia_id`
- `usuario_responsable_id`
- `fecha`
- `observaciones`

Una entrega podrá contener uno o varios insumos.

---

### Detalle de entrega de insumo

Representa cada producto incluido dentro de una entrega.

Atributos:

- `id`
- `entrega_insumo_id`
- `insumo_id`
- `cantidad`
- `unidad_medida`
- `observaciones`

Esta separación permite registrar una sola entrega que contenga varios productos diferentes.

---

## 2.11 Asistencia técnica y seguimiento

### Seguimiento técnico

Representa una recomendación o acción de seguimiento derivada de una evaluación realizada durante una visita.

Atributos:

- `id`
- `evaluacion_cultivo_id`
- `usuario_responsable_id`
- `recomendacion`
- `fecha_programada`
- `fecha_realizada`
- `estado`
- `resultado`
- `observaciones`

Esta entidad permitirá conocer qué problema fue identificado, qué recomendación se realizó y si posteriormente se efectuó el seguimiento correspondiente.

---

## 2.12 Capacitaciones

### Capacitación

Representa una actividad formativa realizada por Viviendas León.

Atributos:

- `id`
- `comunidad_id`
- `tema`
- `descripcion`
- `fecha`
- `hora_inicio`
- `hora_fin`
- `facilitador`
- `observaciones`
- `estado`

---

### Participación en capacitación

Entidad asociativa utilizada para registrar qué integrantes de las familias participaron en una capacitación.

Atributos:

- `id`
- `capacitacion_id`
- `integrante_familia_id`
- `asistio`
- `observaciones`

Esta estructura permitirá conocer posteriormente qué personas o familias han recibido determinadas capacitaciones.

---

## 2.13 Evidencias

### Evidencia

Representa fotografías, documentos u otros archivos relacionados con actividades registradas en la plataforma.

Atributos:

- `id`
- `visita_id`
- `evaluacion_cultivo_id`
- `capacitacion_id`
- `nombre_archivo`
- `ruta_archivo`
- `tipo_archivo`
- `descripcion`
- `fecha_registro`

Los archivos no se almacenarán directamente dentro de la base de datos. La base de datos conservará únicamente los metadatos y la referencia al archivo almacenado en el servicio de almacenamiento definido por la arquitectura.

Dependiendo del tipo de evidencia, algunas de las relaciones podrán ser opcionales.

---

## 2.14 Alertas

### Alerta

Representa un aviso generado por el sistema a partir de determinadas condiciones o actividades pendientes.

Atributos:

- `id`
- `familia_id`
- `visita_id`
- `seguimiento_tecnico_id`
- `tipo`
- `descripcion`
- `fecha_generacion`
- `fecha_vencimiento`
- `estado`
- `fecha_resolucion`

Entre las alertas previstas se encuentran:

- visitas pendientes;
- familias sin seguimiento;
- seguimientos técnicos vencidos;
- registros incompletos;
- actividades próximas.

Las relaciones con familia, visita o seguimiento podrán ser opcionales dependiendo del tipo de alerta.

---

## 2.15 Usuarios, roles y permisos

### Usuario

Representa las cuentas utilizadas para acceder a la plataforma.

Atributos:

- `id`
- `nombre`
- `correo`
- `password_hash`
- `estado`
- `ultimo_acceso`
- `fecha_creacion`

Las contraseñas no deberán almacenarse en texto plano.

---

### Rol

Representa un conjunto de responsabilidades dentro de la plataforma.

Atributos:

- `id`
- `nombre`
- `descripcion`
- `activo`

Roles contemplados inicialmente:

- Trabajador de campo
- Coordinación
- Dirección
- Administración
- Auditoría

---

### Permiso

Representa una acción que puede autorizarse dentro del sistema.

Atributos:

- `id`
- `codigo`
- `nombre`
- `descripcion`

Ejemplos:

- consultar familias;
- registrar familias;
- modificar familias;
- registrar visitas;
- registrar evaluaciones;
- administrar catálogos;
- consultar reportes;
- administrar usuarios;
- consultar auditoría.

---

### Usuario rol

Entidad asociativa utilizada para asignar uno o varios roles a un usuario.

Atributos:

- `usuario_id`
- `rol_id`

---

### Rol permiso

Entidad asociativa utilizada para determinar los permisos disponibles para cada rol.

Atributos:

- `rol_id`
- `permiso_id`

---

## 2.16 Auditoría

### Bitácora

Representa las operaciones relevantes realizadas por los usuarios sobre la información del sistema.

Atributos:

- `id`
- `usuario_id`
- `entidad`
- `registro_id`
- `accion`
- `fecha`
- `datos_anteriores`
- `datos_nuevos`
- `descripcion`

La bitácora permitirá conocer quién realizó una modificación, cuándo se realizó y qué registro fue afectado.

No deberán registrarse contraseñas, tokens u otros datos sensibles dentro de la bitácora.

---

## 3. Relaciones

Las relaciones principales identificadas para el modelo son las siguientes:

| Entidad origen | Cardinalidad | Entidad destino | Descripción |
|---|---|---|---|
| Municipio | 1:N | Comunidad | Un municipio puede contener varias comunidades |
| Comunidad | 1:N | Familia | Una comunidad puede contener varias familias |
| Familia | 1:N | Integrante de familia | Una familia puede contener varios integrantes |
| Familia | N:M | Programa | Una familia puede participar en varios programas |
| Familia | 1:N | Huerto | Una familia puede tener uno o varios huertos |
| Huerto | 1:N | Ciclo de cultivo | Un huerto puede contener varios ciclos de cultivo |
| Cultivo | 1:N | Ciclo de cultivo | Un cultivo puede ser utilizado en distintos ciclos |
| Etapa de cultivo | 1:N | Ciclo de cultivo | Una etapa puede asociarse con distintos ciclos |
| Ciclo de cultivo | 1:N | Registro de producción | Un ciclo puede producir múltiples registros productivos |
| Familia | 1:N | Visita | Una familia puede recibir varias visitas |
| Usuario | 1:N | Visita | Un usuario puede ser responsable de varias visitas |
| Condición climática | 1:N | Visita | Una condición climática puede aparecer en distintas visitas |
| Visita | 1:N | Evaluación de cultivo | Una visita puede evaluar varios cultivos |
| Ciclo de cultivo | 1:N | Evaluación de cultivo | Un ciclo puede ser evaluado varias veces |
| Calidad | 1:N | Evaluación de cultivo | Una calidad puede ser asignada a múltiples evaluaciones |
| Evaluación de cultivo | N:M | Enfermedad | Una evaluación puede presentar varias enfermedades |
| Evaluación de cultivo | N:M | Plaga | Una evaluación puede presentar varias plagas |
| Evaluación de cultivo | 1:N | Tratamiento aplicado | Una evaluación puede tener varios tratamientos |
| Categoría de insumo | 1:N | Insumo | Una categoría puede contener varios insumos |
| Insumo | 1:N | Tratamiento aplicado | Un insumo puede utilizarse en diferentes tratamientos |
| Familia | 1:N | Entrega de insumo | Una familia puede recibir múltiples entregas |
| Entrega de insumo | 1:N | Detalle de entrega | Una entrega puede incluir múltiples productos |
| Insumo | 1:N | Detalle de entrega | Un insumo puede aparecer en múltiples entregas |
| Evaluación de cultivo | 1:N | Seguimiento técnico | Una evaluación puede generar uno o varios seguimientos |
| Usuario | 1:N | Seguimiento técnico | Un usuario puede ser responsable de varios seguimientos |
| Comunidad | 1:N | Capacitación | En una comunidad pueden realizarse varias capacitaciones |
| Capacitación | N:M | Integrante de familia | Varias personas pueden participar en varias capacitaciones |
| Usuario | N:M | Rol | Un usuario puede poseer uno o varios roles |
| Rol | N:M | Permiso | Un rol puede contener varios permisos |
| Usuario | 1:N | Bitácora | Un usuario puede generar múltiples registros de auditoría |

Las relaciones N:M serán resueltas mediante entidades asociativas.

Las principales entidades asociativas son:

- `familia_programa`;
- `evaluacion_enfermedad`;
- `evaluacion_plaga`;
- `participacion_capacitacion`;
- `usuario_rol`;
- `rol_permiso`.

---

## 4. Catálogos iniciales

Los siguientes elementos se administrarán mediante catálogos para evitar almacenar valores repetidos como texto y permitir incorporar nuevos valores sin modificar la estructura de la base de datos.

### 4.1 Cultivos

Valores iniciales proporcionados por Viviendas León:

- Acelga
- Apio
- Brócoli
- Cebolla
- Chile Pimiento
- Cilantro
- Coliflor
- Espinaca
- Frijol bolonillo
- Lechuga
- Rábano / Radish
- Remolacha / Beet
- Repollo
- Tomate
- Zanahoria

Antes de cargar los datos definitivos se deberá definir si los nombres en español e inglés se conservarán dentro del mismo nombre o mediante atributos separados.

---

### 4.2 Etapas de cultivo

Valores iniciales:

- Almácigo
- Trasplantado

El catálogo podrá ampliarse posteriormente si Viviendas León necesita registrar nuevas etapas de desarrollo.

---

### 4.3 Enfermedades

Valores iniciales proporcionados:

- Alternaria
- Antracnosis
- Botritis
- Cercospora
- Mal de Talluelo
- Mildiu
- Damping-off
- Hernia de las crucíferas
- Mancha de anillo u ojo de sapo
- Necrosis
- Oidio
- Phytophthora capsica (Marchitez)
- Royas y carbones
- Sigatoka
- Tizón tardío
- Tizón temprano
- Virosis

---

### 4.4 Plagas

Valores iniciales proporcionados:

- Ácaro
- Araña roja
- Aves
- Caracoles y babosas
- Chinche
- Cogollero
- Gallina ciega
- Hormigas
- Larvas o gusanos
- Mildiu
- Minador de hoja
- Mosca blanca
- Mosca gusano
- Pulgón
- Trips

El valor `Mildiu` aparece dentro de la información proporcionada como plaga y también como enfermedad. Esta clasificación deberá validarse antes de cargar los datos definitivos.

---

### 4.5 Porcentajes de daño

Los formularios actuales utilizan principalmente:

- 1 %
- 3 %
- 5 %
- 10 %
- 20 %

Estos valores no se manejarán como un catálogo independiente.

El sistema almacenará el porcentaje como valor numérico, permitiendo utilizar los porcentajes actuales y agregar otros valores cuando sea necesario.

---

### 4.6 Calidad

Valores iniciales:

- Excelente
- Bueno
- Regular/Medio
- Malo

---

### 4.7 Condiciones climáticas

Valores iniciales:

- Claro
- Nublado
- Lluvia ligera
- Lluvia pesada
- Viento ligero
- Viento pesado

---

### 4.8 Insecticidas orgánicos

Valores proporcionados:

- Ajo
- Cal
- Cebolla, Ajo, Vinagre
- Clavo de olor
- Corteza de sauce
- Crisantemos, margaritas o gerberas
- Eucalipto
- Flor de muerto y ruda
- Jabón
- Manzanilla
- Nim
- Té de tabaco
- Option 14

`Option 14` corresponde a un valor presente en la información recibida y deberá validarse antes de incorporarlo como dato definitivo.

---

### 4.9 Abonos orgánicos

Valores proporcionados:

- Bocashi
- Foliar a base de chichicaste, apasote y albahaca
- Foliar a base de encino
- Foliar a base de sauco, aliso y hierba mora
- Té de estiércol o compost

---

### 4.10 Productos químicos proporcionados

Valores recibidos:

- Sipermetrina
- Lodam
- Triple 15
- Urea
- Triple 20

Estos valores se conservarán inicialmente como información proporcionada por la institución.

Su clasificación y escritura deberán revisarse antes de construir los datos iniciales definitivos, debido a que algunos productos pueden corresponder a fertilizantes u otras categorías y no necesariamente a insecticidas.

---

### 4.11 Categorías de insumos

Se propone utilizar inicialmente las siguientes categorías:

- Insecticida orgánico
- Abono orgánico
- Producto químico
- Fertilizante
- Semilla
- Pilón
- Herramienta
- Otro

La categoría permitirá incorporar nuevos productos sin crear nuevas tablas.

---

### 4.12 Ubicación

Municipio inicial:

- Santa Lucía Utatlán

Comunidades iniciales:

- Los Planes
- Paxub'
- Ciénaga Grande

---

## 5. Consideraciones de diseño

### 5.1 Separación entre catálogo y registro operativo

Los cultivos, enfermedades, plagas, etapas, condiciones climáticas, calidades, categorías e insumos se administrarán como catálogos.

Por ejemplo, `Tomate` existirá una sola vez dentro del catálogo de cultivos.

Cuando una familia cultive tomate, se creará un `Ciclo de cultivo` relacionado con el registro `Tomate`.

Esto evita duplicar información y permite conservar el historial agrícola de cada familia.

---

### 5.2 Ciclo de cultivo como entidad central de gestión agrícola

La entidad `Ciclo de cultivo` representará la relación entre:

- una familia;
- un huerto;
- un cultivo;
- una cantidad de plantas;
- una etapa;
- un periodo determinado.

La producción, evaluaciones y demás información histórica se relacionarán con el ciclo correspondiente.

De esta manera, un mismo huerto puede producir el mismo cultivo en diferentes periodos sin sobrescribir información anterior.

---

### 5.3 Producción por periodos

Los registros de producción estarán asociados a un ciclo de cultivo y a un periodo.

Esto permitirá obtener información trimestral, semestral o anual sin crear tablas específicas para cada tipo de reporte.

---

### 5.4 Reportes e indicadores

Los reportes e indicadores se obtendrán a partir de los registros operacionales y no se modelarán inicialmente como entidades independientes.

Entre los resultados que podrán calcularse se encuentran:

- cantidad de familias atendidas;
- huertos activos;
- cultivos establecidos;
- producción total;
- ingresos estimados;
- visitas realizadas;
- familias sin seguimiento;
- plagas más frecuentes;
- enfermedades más frecuentes;
- tratamientos utilizados;
- capacitaciones realizadas;
- insumos entregados;
- comparaciones entre comunidades;
- comparaciones entre periodos.

---

### 5.5 Porcentajes de daño

Los porcentajes de daño por enfermedad y plaga se almacenarán como valores numéricos.

No se creará una tabla independiente para los valores 1 %, 3 %, 5 %, 10 % y 20 %.

Esto permitirá incorporar otros niveles de afectación en el futuro sin modificar el modelo.

---

### 5.6 Plagas y enfermedades

Una evaluación puede identificar ninguna, una o varias enfermedades.

De la misma manera, una evaluación puede identificar ninguna, una o varias plagas.

Por esta razón, las relaciones se implementarán mediante:

- `evaluacion_enfermedad`;
- `evaluacion_plaga`.

Estas entidades también permitirán guardar el porcentaje de daño específico de cada problema detectado.

---

### 5.7 Tratamientos e insumos entregados

Los tratamientos aplicados y los insumos entregados se mantendrán como conceptos distintos.

`Tratamiento aplicado` representa la utilización de un producto sobre un cultivo como respuesta a una evaluación.

`Entrega de insumo` representa un recurso proporcionado por Viviendas León a una familia.

Un mismo producto podrá participar en ambos procesos cuando corresponda.

---

### 5.8 Historial agrícola

El modelo conservará relaciones suficientes para reconstruir el historial agrícola de cada familia.

A partir de una familia será posible consultar:

- comunidad;
- programas;
- integrantes;
- huertos;
- cultivos;
- ciclos de cultivo;
- cantidad de plantas;
- producción;
- ventas;
- visitas;
- evaluaciones;
- plagas;
- enfermedades;
- porcentajes de daño;
- tratamientos;
- seguimientos;
- insumos entregados;
- capacitaciones.

---

### 5.9 Visitas y evaluaciones

Una visita representa la actividad realizada con una familia.

Una evaluación representa la revisión de un cultivo específico durante esa visita.

Esta separación es necesaria porque una sola visita puede incluir la evaluación de varios cultivos.

Ejemplo:

Visita a una familia:

- evaluación de tomate;
- evaluación de brócoli;
- evaluación de lechuga.

Cada evaluación podrá registrar de forma independiente su calidad, plagas, enfermedades y tratamientos.

---

### 5.10 Asistencia técnica y seguimiento

Las recomendaciones técnicas no deberán sobrescribirse cuando se realice una nueva visita.

Cada seguimiento permanecerá registrado para conservar la trazabilidad de las recomendaciones emitidas y los resultados observados posteriormente.

---

### 5.11 Catálogos administrables

Los valores de los catálogos no deberán mantenerse directamente dentro del código de la aplicación.

Los usuarios autorizados podrán administrar los catálogos correspondientes.

Esto permitirá incorporar nuevos:

- cultivos;
- enfermedades;
- plagas;
- productos;
- categorías;
- condiciones climáticas;
- calidades;

sin modificar el código fuente de la plataforma.

---

### 5.12 Eliminación lógica

Para entidades que formen parte del historial institucional se evitará eliminar físicamente registros cuando esto afecte la trazabilidad.

Cuando corresponda, se utilizarán atributos como:

- `activo`;
- `estado`;
- `fecha_baja`.

Esto permitirá desactivar elementos sin perder información histórica.

---

### 5.13 Auditoría

Las acciones relevantes deberán generar registros de auditoría.

Como mínimo se deberá poder identificar:

- usuario responsable;
- acción realizada;
- fecha y hora;
- entidad afectada;
- registro afectado;
- información anterior cuando corresponda;
- información nueva cuando corresponda.

La bitácora no deberá almacenar contraseñas ni credenciales sensibles.

---

### 5.14 Archivos y evidencias

Las fotografías y documentos no deberán almacenarse directamente como archivos binarios dentro de PostgreSQL.

La base de datos almacenará únicamente:

- identificador;
- metadatos;
- nombre;
- tipo de archivo;
- referencia o ruta del archivo.

El archivo físico se almacenará mediante el servicio de almacenamiento definido dentro de la arquitectura.

---

### 5.15 Funcionamiento sin conexión

El funcionamiento sin conexión de la PWA no requiere duplicar el modelo completo mediante tablas adicionales dentro de PostgreSQL.

Los registros creados sin conexión se almacenarán temporalmente en IndexedDB y posteriormente serán enviados al servidor mediante el mecanismo de sincronización.

El backend será responsable de validar los registros antes de almacenarlos definitivamente.

Durante el diseño de la sincronización deberán considerarse:

- identificadores únicos;
- registros pendientes;
- reintentos;
- duplicados;
- conflictos;
- estado de sincronización.

---

### 5.16 Alcance

El modelo se enfoca en los módulos incluidos dentro del alcance actual:

- familias y beneficiarios;
- gestión agrícola;
- visitas y asistencia técnica;
- capacitaciones;
- insumos;
- reportes, indicadores y alertas;
- usuarios, permisos y auditoría;
- funcionamiento sin conexión.

El módulo de voluntariado no forma parte del alcance actual y, por lo tanto, no se incluyen entidades relacionadas con voluntarios, grupos de voluntarios o actividades de voluntariado en este modelo.

---

## 6. Resumen del modelo lógico

La estructura general del dominio puede representarse de la siguiente forma:

```text
MUNICIPIO
    │
    └── COMUNIDAD
            │
            ├── FAMILIA
            │     │
            │     ├── INTEGRANTE_FAMILIA
            │     │
            │     ├── FAMILIA_PROGRAMA ─── PROGRAMA
            │     │
            │     ├── HUERTO
            │     │     │
            │     │     └── CICLO_CULTIVO ─── CULTIVO
            │     │            │
            │     │            ├── ETAPA_CULTIVO
            │     │            │
            │     │            ├── REGISTRO_PRODUCCION
            │     │            │
            │     │            └── EVALUACION_CULTIVO
            │     │                   │
            │     │                   ├── CALIDAD
            │     │                   │
            │     │                   ├── EVALUACION_ENFERMEDAD
            │     │                   │       └── ENFERMEDAD
            │     │                   │
            │     │                   ├── EVALUACION_PLAGA
            │     │                   │       └── PLAGA
            │     │                   │
            │     │                   ├── TRATAMIENTO_APLICADO
            │     │                   │       └── INSUMO
            │     │                   │
            │     │                   └── SEGUIMIENTO_TECNICO
            │     │
            │     ├── VISITA
            │     │     ├── CONDICION_CLIMATICA
            │     │     └── EVALUACION_CULTIVO
            │     │
            │     └── ENTREGA_INSUMO
            │            │
            │            └── DETALLE_ENTREGA_INSUMO
            │                     └── INSUMO
            │
            └── CAPACITACION
                    │
                    └── PARTICIPACION_CAPACITACION
                            └── INTEGRANTE_FAMILIA


CATEGORIA_INSUMO
    │
    └── INSUMO


USUARIO
    │
    ├── VISITA
    ├── SEGUIMIENTO_TECNICO
    ├── BITACORA
    │
    └── USUARIO_ROL
             │
             └── ROL
                  │
                  └── ROL_PERMISO
                           │
                           └── PERMISO


ALERTA
    ├── FAMILIA
    ├── VISITA
    └── SEGUIMIENTO_TECNICO