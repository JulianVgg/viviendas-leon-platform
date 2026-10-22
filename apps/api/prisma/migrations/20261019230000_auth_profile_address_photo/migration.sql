-- FAM-06 extensión: permisos de administración de municipios.
INSERT INTO "permiso" ("codigo", "nombre", "descripcion") VALUES
  ('PANTALLA_MUNICIPIOS', 'Municipios', 'Acceso a la administración de municipios.'),
  ('MUNICIPIOS_WRITE', 'Administrar municipios', 'Registrar, editar, activar y desactivar municipios.')
ON CONFLICT ("codigo") DO NOTHING;

INSERT INTO "rol_permiso" ("rol_id", "permiso_id")
SELECT r."id", p."id"
FROM "rol" r
JOIN "permiso" p ON p."codigo" IN ('PANTALLA_MUNICIPIOS', 'MUNICIPIOS_WRITE')
WHERE r."nombre" IN ('Dirección general', 'Coordinadora del programa agroforestal')
ON CONFLICT ("rol_id", "permiso_id") DO NOTHING;
