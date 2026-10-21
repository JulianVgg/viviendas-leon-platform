-- Coordinación puede abrir la agenda técnica desde el calendario general.
-- No concede otros permisos de captura ni acceso administrativo.
INSERT INTO "rol_permiso" ("rol_id", "permiso_id")
SELECT r."id", p."id"
FROM "rol" r
JOIN "permiso" p ON p."codigo" = 'PANTALLA_VISITAS_AGENDA'
WHERE r."nombre" = 'Coordinadora del programa agroforestal'
  AND r."activo" = TRUE
ON CONFLICT ("rol_id", "permiso_id") DO NOTHING;
