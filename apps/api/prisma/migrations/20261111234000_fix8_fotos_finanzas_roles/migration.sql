-- FIX8: fotos de familia en PostgreSQL (Railway no preserva el filesystem sin volumen).
-- Los archivos antiguos siguen sirviéndose cuando estén disponibles; no se pueden reconstruir los desaparecidos.
CREATE TABLE IF NOT EXISTS "familia_foto" (
  "familia_id" INTEGER PRIMARY KEY REFERENCES "familia"("id") ON DELETE CASCADE,
  "mime" TEXT NOT NULL CHECK ("mime" IN ('image/jpeg', 'image/png', 'image/webp')),
  "contenido" BYTEA NOT NULL CHECK (octet_length("contenido") BETWEEN 1 AND 4194304),
  "actualizada_en" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Vista de seguimiento contable, de solo lectura. Sin permisos para modificar pagos ni bancos.
INSERT INTO "permiso" ("codigo", "nombre", "descripcion") VALUES
  ('PANTALLA_CONTROL_FINANCIERO', 'Control financiero', 'Consulta y descarga de las ventas agrícolas registradas.')
ON CONFLICT ("codigo") DO NOTHING;

INSERT INTO "rol_permiso" ("rol_id", "permiso_id")
SELECT r."id", p."id"
FROM "rol" r CROSS JOIN "permiso" p
WHERE r."nombre" IN ('Dirección general', 'Contadora interna', 'Auditor')
  AND p."codigo" IN ('PANTALLA_AUDITORIA', 'PANTALLA_CONTROL_FINANCIERO')
ON CONFLICT DO NOTHING;

-- La bitácora técnica es exclusiva de Dirección. No se borra ningún evento histórico.
DELETE FROM "rol_permiso" rp
USING "rol" r, "permiso" p
WHERE rp."rol_id" = r."id" AND rp."permiso_id" = p."id"
  AND p."codigo" = 'PANTALLA_BITACORA'
  AND r."nombre" <> 'Dirección general';
