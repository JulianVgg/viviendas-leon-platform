-- El técnico puede administrar registros operativos igual que Coordinación.
-- No hereda usuarios, roles, auditoría, administración institucional ni reportes.
-- Idempotente: no revoca permisos configurados previamente.
INSERT INTO "rol_permiso" ("rol_id", "permiso_id")
SELECT tecnico."id", rp."permiso_id"
FROM "rol" tecnico
JOIN "rol" coordinacion ON coordinacion."nombre" IN
  ('Coordinadora del programa agroforestal', 'Coordinador del programa agroforestal', 'Coordinación')
JOIN "rol_permiso" rp ON rp."rol_id" = coordinacion."id"
JOIN "permiso" p ON p."id" = rp."permiso_id"
WHERE tecnico."nombre" = 'Técnico agropecuario'
AND (p."codigo" IN (
  'FAMILIAS_WRITE', 'HUERTOS_WRITE', 'CICLOS_WRITE', 'CULTIVOS_WRITE', 'PRODUCCION_WRITE',
  'PANTALLA_FAMILIAS', 'PANTALLA_FAMILIAS_CREAR', 'PANTALLA_FAMILIAS_DETALLE',
  'PANTALLA_FAMILIAS_EDITAR', 'PANTALLA_HUERTOS', 'PANTALLA_CICLOS',
  'PANTALLA_CULTIVOS', 'PANTALLA_PRODUCCION', 'PANTALLA_GESTION_AGRICOLA',
  'PANTALLA_COMUNIDADES', 'PANTALLA_MUNICIPIOS', 'PANTALLA_PROGRAMAS',
  'COMUNIDADES_WRITE', 'MUNICIPIOS_WRITE', 'PROGRAMAS_WRITE',
  'PANTALLA_CAPACITACIONES', 'CAPACITACIONES_WRITE'
))
ON CONFLICT ("rol_id", "permiso_id") DO NOTHING;

-- Catálogos existentes en el formulario de Visitas Técnicas (no tocar datos históricos).
INSERT INTO "etapa_cultivo" ("nombre", "activo") VALUES
 ('Almácigo', TRUE), ('Trasplantado', TRUE)
ON CONFLICT ("nombre") DO NOTHING;
INSERT INTO "calidad" ("nombre", "activo") VALUES
 ('Excelente', TRUE), ('Bueno', TRUE), ('Regular/Medio', TRUE), ('Malo', TRUE)
ON CONFLICT ("nombre") DO NOTHING;
