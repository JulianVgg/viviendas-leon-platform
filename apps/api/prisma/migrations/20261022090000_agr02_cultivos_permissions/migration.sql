-- AGR-02: el modelo cultivo/ciclo_cultivo ya existe; únicamente se añaden permisos.
INSERT INTO "permiso" ("codigo", "nombre", "descripcion") VALUES
  ('PANTALLA_CULTIVOS', 'Cultivos', 'Consultar el catálogo de cultivos agrícolas.'),
  ('CULTIVOS_WRITE', 'Administrar cultivos', 'Registrar, editar y desactivar cultivos agrícolas.')
ON CONFLICT ("codigo") DO NOTHING;

INSERT INTO "rol_permiso" ("rol_id", "permiso_id")
SELECT r."id", p."id" FROM "rol" r CROSS JOIN "permiso" p
WHERE r."nombre" IN ('Coordinadora del programa agroforestal', 'Técnico agropecuario')
  AND p."codigo" IN ('PANTALLA_CULTIVOS', 'CULTIVOS_WRITE')
ON CONFLICT ("rol_id", "permiso_id") DO NOTHING;
