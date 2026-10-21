-- AGR-01. Los archivos se guardan fuera de PostgreSQL; la tabla guarda sus metadatos.
ALTER TABLE "huerto"
  ADD COLUMN "imagen_ruta" TEXT,
  ADD COLUMN "imagen_nombre" TEXT,
  ADD COLUMN "imagen_mime" TEXT,
  ADD COLUMN "imagen_actualizada_en" TIMESTAMP(3);

INSERT INTO "permiso" ("codigo", "nombre", "descripcion") VALUES
  ('HUERTOS_WRITE', 'Registrar huertos', 'Permite registrar huertos e incorporar su imagen satelital.'),
  ('PANTALLA_HUERTOS', 'Huertos', 'Acceso a la gestión de huertos.')
ON CONFLICT ("codigo") DO NOTHING;

INSERT INTO "rol_permiso" ("rol_id", "permiso_id")
SELECT r.id, p.id FROM "rol" r CROSS JOIN "permiso" p
WHERE r.nombre IN ('Coordinadora del programa agroforestal', 'Técnico agropecuario')
  AND p.codigo IN ('HUERTOS_WRITE', 'PANTALLA_HUERTOS')
ON CONFLICT ("rol_id", "permiso_id") DO NOTHING;
