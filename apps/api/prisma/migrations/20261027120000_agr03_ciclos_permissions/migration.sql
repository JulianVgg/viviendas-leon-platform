-- AGR-03: el modelo ciclo_cultivo ya existe; permisos separados de catálogo de cultivos.
INSERT INTO "permiso" ("codigo", "nombre", "descripcion") VALUES
  ('PANTALLA_CICLOS', 'Ciclos agrícolas', 'Consultar siembras activas e históricas.'),
  ('CICLOS_WRITE', 'Registrar siembras', 'Registrar nuevos ciclos en huertos activos.')
ON CONFLICT ("codigo") DO NOTHING;

INSERT INTO "rol_permiso" ("rol_id", "permiso_id")
SELECT r."id", p."id" FROM "rol" r CROSS JOIN "permiso" p
WHERE r."nombre" IN ('Coordinadora del programa agroforestal', 'Técnico agropecuario')
  AND p."codigo" IN ('PANTALLA_CICLOS', 'CICLOS_WRITE')
ON CONFLICT ("rol_id", "permiso_id") DO NOTHING;
