-- CIR-15: revisiones por período y alcance + historial de acciones.
CREATE TABLE "reporte_semestral_revision" (
  "id" SERIAL PRIMARY KEY,
  "clave" VARCHAR(100) NOT NULL UNIQUE,
  "anio" INTEGER NOT NULL,
  "semestre" INTEGER NOT NULL,
  "comunidad_id" INTEGER,
  "familia_id" INTEGER,
  "estado" VARCHAR(20) NOT NULL,
  "huella" VARCHAR(64) NOT NULL,
  "comentario" VARCHAR(1000),
  "revisado_por_id" INTEGER REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "revisado_en" TIMESTAMPTZ(6),
  "validado_por_id" INTEGER REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "validado_en" TIMESTAMPTZ(6),
  "actualizado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  CONSTRAINT "reporte_revision_semestre_chk" CHECK ("semestre" IN (1, 2)),
  CONSTRAINT "reporte_revision_estado_chk" CHECK ("estado" IN ('EN_REVISION', 'VALIDADO'))
);
CREATE INDEX "reporte_semestral_revision_anio_semestre_idx" ON "reporte_semestral_revision" ("anio", "semestre");

CREATE TABLE "reporte_semestral_evento" (
  "id" SERIAL PRIMARY KEY,
  "revision_id" INTEGER NOT NULL REFERENCES "reporte_semestral_revision"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "usuario_id" INTEGER NOT NULL REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "accion" VARCHAR(24) NOT NULL,
  "huella" VARCHAR(64) NOT NULL,
  "comentario" VARCHAR(1000),
  "registrado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);
CREATE INDEX "reporte_semestral_evento_revision_id_registrado_en_idx" ON "reporte_semestral_evento" ("revision_id", "registrado_en");

INSERT INTO "permiso" ("codigo", "nombre", "descripcion") VALUES
 ('REPORTE_SEMESTRAL_REVISAR', 'Revisar reportes semestrales', 'Marcar un informe semestral en revisión y registrar observaciones.'),
 ('REPORTE_SEMESTRAL_VALIDAR', 'Validar reportes semestrales', 'Aprobar institucionalmente un informe revisado.')
ON CONFLICT ("codigo") DO NOTHING;

-- La Dirección tiene bypass de permisos; se asignan explícitamente para transparencia.
INSERT INTO "rol_permiso" ("rol_id", "permiso_id")
SELECT r."id", p."id" FROM "rol" r JOIN "permiso" p ON
  (p."codigo" = 'REPORTE_SEMESTRAL_REVISAR' AND r."nombre" IN ('Dirección general', 'Coordinadora del programa agroforestal'))
  OR (p."codigo" = 'REPORTE_SEMESTRAL_VALIDAR' AND r."nombre" = 'Dirección general')
ON CONFLICT DO NOTHING;

-- Coordinación debe poder consultar el informe para revisarlo.
INSERT INTO "rol_permiso" ("rol_id", "permiso_id")
SELECT r."id", p."id" FROM "rol" r CROSS JOIN "permiso" p
WHERE r."nombre" = 'Coordinadora del programa agroforestal' AND p."codigo" IN ('PANTALLA_REPORTES', 'PANTALLA_REPORTES_LISTA')
ON CONFLICT DO NOTHING;
