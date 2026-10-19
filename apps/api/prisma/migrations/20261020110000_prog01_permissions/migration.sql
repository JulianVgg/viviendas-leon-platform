-- PROG-01: permisos de pantalla y operaciones del catálogo de programas.
-- Migración de datos idempotente; no altera el modelo Prisma existente.
INSERT INTO "permiso" ("codigo", "nombre", "descripcion") VALUES
  ('PANTALLA_PROGRAMAS', 'Programas', 'Consulta de administración de programas institucionales.'),
  ('PROGRAMAS_WRITE', 'Administrar programas', 'Crear y modificar programas y su estado.')
ON CONFLICT ("codigo") DO NOTHING;

INSERT INTO "rol_permiso" ("rol_id", "permiso_id")
SELECT r."id", p."id"
FROM "rol" r
JOIN "permiso" p ON p."codigo" IN ('PANTALLA_PROGRAMAS', 'PROGRAMAS_WRITE')
WHERE r."nombre" IN ('Dirección general', 'Coordinadora del programa agroforestal')
ON CONFLICT ("rol_id", "permiso_id") DO NOTHING;
