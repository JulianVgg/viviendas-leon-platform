-- AGR-05: ya existen las tablas de producción y detalle; habilitar captura por rol.
INSERT INTO "permiso" ("codigo", "nombre", "descripcion") VALUES
  ('PANTALLA_PRODUCCION', 'Producción agrícola', 'Consultar cosechas y resultados productivos.'),
  ('PRODUCCION_WRITE', 'Registrar producción agrícola', 'Registrar cosechas para ciclos existentes.')
ON CONFLICT ("codigo") DO NOTHING;

INSERT INTO "rol_permiso" ("rol_id", "permiso_id")
SELECT r."id", p."id" FROM "rol" r CROSS JOIN "permiso" p
WHERE r."nombre" IN ('Coordinadora del programa agroforestal', 'Técnico agropecuario')
  AND p."codigo" IN ('PANTALLA_PRODUCCION', 'PRODUCCION_WRITE')
ON CONFLICT ("rol_id", "permiso_id") DO NOTHING;

-- Catálogo mínimo para producción. No altera unidades que ya existen.
-- Las cifras de diferentes unidades NO deben sumarse directamente en reportes.
INSERT INTO "unidad_medida" ("codigo", "nombre", "abreviatura", "activo") VALUES
  ('KG', 'Kilogramo', 'kg', TRUE),
  ('LB', 'Libra', 'lb', TRUE),
  ('UNIDAD', 'Unidad', 'unid.', TRUE),
  ('MANOJO', 'Manojo', 'manojos', TRUE)
ON CONFLICT ("codigo") DO NOTHING;
