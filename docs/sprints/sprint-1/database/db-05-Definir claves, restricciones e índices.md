## Implementación de claves, restricciones e índices

Se definieron y verificaron las claves primarias (PK) de todas las entidades principales del sistema, utilizando `id AUTO_INCREMENT PRIMARY KEY` en la mayoría de tablas y claves compuestas en tablas como `usuario_rol` y `rol_permiso`.

Tambien, se definieron claves foráneas (FK) para garantizar la integridad entre módulos como ubicación geográfica, familias, programas, usuarios, huertos, ciclos de cultivo, visitas, evaluaciones, insumos, producción y capacitaciones.

### Restricciones de integridad implementadas
- Restricciones `NOT NULL` en campos obligatorios.
- Restricciones `UNIQUE` para evitar duplicados en nombres, correos y códigos.
- Restricciones `CHECK` para validar estados permitidos, rangos numéricos, porcentajes de daño y coherencia de fechas.
- Reglas `ON UPDATE` y `ON DELETE` apropiadas según dependencia lógica (`CASCADE`, `RESTRICT`, `SET NULL`).

### Índices definidos
Se agregaron índices sobre:
- claves foráneas, para optimizar joins y búsquedas relacionales;
- campos de fecha, para reportes y filtros temporales;
- combinaciones específicas como `(entidad, registro_id)` en bitácora, para agilizar auditorías;
- restricciones `UNIQUE`, que también contribuyen a la eficiencia.

### Justificación técnica
Estas decisiones permiten:
- preservar integridad referencial;
- Evitar datos inválidos o inconsistentes;
- mejorar el rendimiento de consultas frecuentes del sistema.