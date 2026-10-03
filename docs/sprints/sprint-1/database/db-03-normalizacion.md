# DB-03 — Normalización del modelo de datos

## 1. Objetivo

Revisar y normalizar el modelo lógico de datos definido en DB-02 con el propósito de reducir redundancias, evitar inconsistencias y disminuir posibles anomalías de inserción, actualización y eliminación.

La revisión contempla la aplicación de Primera Forma Normal (1FN), Segunda Forma Normal (2FN) y Tercera Forma Normal (3FN) sobre las entidades correspondientes al alcance actual de la plataforma de Viviendas León.

Como resultado de este proceso se realizaron ajustes sobre el modelo lógico original, principalmente en el manejo de producción agrícola, ventas, unidades de medida, monedas, evidencias, seguimiento técnico y relaciones de muchos a muchos.

---

# 2. Modelo evaluado

La normalización se realizó tomando como base el modelo lógico definido en DB-02.

Las principales áreas evaluadas fueron:

- ubicación;
- familias y beneficiarios;
- programas;
- huertos;
- cultivos;
- producción agrícola;
- ventas;
- visitas;
- evaluaciones agrícolas;
- enfermedades;
- plagas;
- tratamientos;
- insumos;
- entrega de insumos;
- asistencia técnica;
- capacitaciones;
- evidencias;
- alertas;
- usuarios;
- roles;
- permisos;
- auditoría.

El análisis buscó verificar que cada atributo se encontrara almacenado en la entidad adecuada y que no existieran dependencias innecesarias entre atributos no clave.

---

# 3. Primera Forma Normal — 1FN

## 3.1 Definición aplicada

Para efectos del modelo, una entidad cumple Primera Forma Normal cuando:

- cada fila puede identificarse mediante una clave;
- cada atributo almacena un valor atómico;
- no existen grupos repetidos dentro de una misma fila;
- no se utilizan columnas múltiples para representar el mismo tipo de dato;
- los conjuntos de valores se representan mediante relaciones o tablas independientes.

---

## 3.2 Revisión de atributos atómicos

Los atributos del modelo fueron definidos para almacenar un único valor.

Por ejemplo, no se utilizan estructuras como:

```text
plaga_1
plaga_2
plaga_3