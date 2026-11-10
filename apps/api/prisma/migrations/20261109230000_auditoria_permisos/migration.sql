-- Otorgar al rol institucional Auditor acceso de lectura a la bitácora.
-- Los permisos ya existen en AUTH-04, pero se insertan idempotentemente.
BEGIN;
INSERT INTO "permiso" ("codigo", "nombre", "descripcion") VALUES
  ('PANTALLA_AUDITORIA', 'Auditoría', 'Acceso general al módulo de auditoría.'),
  ('PANTALLA_BITACORA', 'Bitácora', 'Consulta de las operaciones registradas.')
ON CONFLICT ("codigo") DO NOTHING;

INSERT INTO "rol_permiso" ("rol_id", "permiso_id")
SELECT r."id", p."id" FROM "rol" r
CROSS JOIN "permiso" p
WHERE r."nombre" = 'Auditor'
  AND p."codigo" IN ('PANTALLA_AUDITORIA', 'PANTALLA_BITACORA')
ON CONFLICT ("rol_id", "permiso_id") DO NOTHING;
COMMIT;
