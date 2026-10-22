-- CAP-01: agregar acceso de escritura a capacitaciones sin tocar usuarios ni permisos existentes.
-- Esta migración solo agrega datos de permisos; no cambia schema.prisma.
INSERT INTO "permiso" ("codigo", "nombre", "descripcion") VALUES
  ('CAPACITACIONES_WRITE', 'Registrar capacitaciones', 'Permite registrar capacitaciones institucionales.')
ON CONFLICT ("codigo") DO NOTHING;

INSERT INTO "rol_permiso" ("rol_id", "permiso_id")
SELECT r."id", p."id"
FROM "rol" r
JOIN "permiso" p ON p."codigo" IN ('PANTALLA_CAPACITACIONES', 'CAPACITACIONES_WRITE')
WHERE r."nombre" IN (
  'Dirección general',
  'Coordinadora del programa agroforestal',
  'Técnico agropecuario'
)
ON CONFLICT ("rol_id", "permiso_id") DO NOTHING;
