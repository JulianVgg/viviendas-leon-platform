-- FAM-06: permisos para gestionar el catálogo de comunidades.
-- La migración es idempotente y respeta las asignaciones anteriores.
INSERT INTO "permiso" ("codigo", "nombre", "descripcion") VALUES
  ('PANTALLA_COMUNIDADES', 'Comunidades', 'Acceso a la administración de comunidades.'),
  ('COMUNIDADES_WRITE', 'Administrar comunidades', 'Registrar, editar, activar y desactivar comunidades.')
ON CONFLICT ("codigo") DO NOTHING;

INSERT INTO "rol_permiso" ("rol_id", "permiso_id")
SELECT r."id", p."id"
FROM "rol" r
JOIN "permiso" p ON p."codigo" IN ('PANTALLA_COMUNIDADES', 'COMUNIDADES_WRITE')
WHERE r."nombre" IN ('Dirección general', 'Coordinadora del programa agroforestal')
ON CONFLICT ("rol_id", "permiso_id") DO NOTHING;
