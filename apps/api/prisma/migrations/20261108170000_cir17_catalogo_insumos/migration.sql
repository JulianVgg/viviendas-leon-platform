-- CIR-17: reutilizar categoria_insumo e insumo; solo se habilita permiso administrativo.
INSERT INTO "permiso" ("codigo", "nombre", "descripcion")
VALUES ('INSUMOS_WRITE', 'Administrar insumos', 'Crear y actualizar categorías y productos, activar o desactivar opciones.')
ON CONFLICT ("codigo") DO NOTHING;

INSERT INTO "rol_permiso" ("rol_id", "permiso_id")
SELECT r."id", p."id"
FROM "rol" r
JOIN "permiso" p ON p."codigo" IN ('INSUMOS_WRITE', 'PANTALLA_INSUMOS')
WHERE r."nombre" IN ('Dirección general', 'Coordinadora del programa agroforestal')
ON CONFLICT ("rol_id", "permiso_id") DO NOTHING;

-- Propuestas de CIR-17, NO confirmadas por ViviendasLeón:
-- se guardan INACTIVAS hasta que Yohan valide nombres y usos.
INSERT INTO "categoria_insumo" ("nombre", "descripcion", "activo") VALUES
('Microorganismos benéficos', 'Bioinsumos y cultivos microbianos utilizados en los huertos.', true),
('Abonos orgánicos', 'Mejoradores y enmiendas para el suelo.', true),
('Preparados líquidos orgánicos', 'Extractos y preparados de aplicación foliar o al suelo.', true)
ON CONFLICT ("nombre") DO NOTHING;

INSERT INTO "insumo" ("categoria_insumo_id", "nombre", "descripcion", "activo")
SELECT c."id", propuesta.nombre, 'Propuesta CIR-17. Pendiente de confirmar con el técnico agrónomo.', false
FROM (VALUES
  ('Microorganismos benéficos', 'Microorganismos de montaña'),
  ('Abonos orgánicos', 'Lombricompost'),
  ('Preparados líquidos orgánicos', 'Super magro'),
  ('Preparados líquidos orgánicos', 'Lixiviados')
) AS propuesta(categoria, nombre)
JOIN "categoria_insumo" c ON c."nombre" = propuesta.categoria
ON CONFLICT ("categoria_insumo_id", "nombre") DO NOTHING;
