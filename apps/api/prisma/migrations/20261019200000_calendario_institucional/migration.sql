-- Calendario institucional, independiente del calendario técnico.
-- Migración no destructiva: crea dos tablas y un permiso de pantalla.
CREATE TABLE "evento_institucional" (
  "id" SERIAL PRIMARY KEY,
  "titulo" VARCHAR(160) NOT NULL,
  "categoria" VARCHAR(40) NOT NULL,
  "descripcion" VARCHAR(2000),
  "lugar" VARCHAR(180),
  "fecha_inicio" DATE NOT NULL,
  "fecha_fin" DATE NOT NULL,
  "hora_inicio" VARCHAR(5),
  "hora_fin" VARCHAR(5),
  "responsable_id" INTEGER NOT NULL REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "creado_por_id" INTEGER NOT NULL REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "creado_en" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "actualizado_en" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "evento_institucional_fechas_chk" CHECK ("fecha_fin" >= "fecha_inicio"),
  CONSTRAINT "evento_institucional_horas_chk" CHECK (
    ("hora_inicio" IS NULL AND "hora_fin" IS NULL)
    OR ("hora_inicio" IS NOT NULL AND "hora_fin" IS NOT NULL AND "hora_fin" > "hora_inicio")
  )
);
CREATE INDEX "evento_institucional_fechas_idx" ON "evento_institucional"("fecha_inicio", "fecha_fin");
CREATE INDEX "evento_institucional_responsable_idx" ON "evento_institucional"("responsable_id");
CREATE TABLE "evento_institucional_participante" (
  "evento_id" INTEGER NOT NULL REFERENCES "evento_institucional"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "usuario_id" INTEGER NOT NULL REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  PRIMARY KEY ("evento_id", "usuario_id")
);
CREATE INDEX "evento_institucional_participante_usuario_idx" ON "evento_institucional_participante"("usuario_id");
INSERT INTO "permiso"("codigo", "nombre", "descripcion")
VALUES ('PANTALLA_CALENDARIO', 'Calendario institucional', 'Consultar el calendario general de la organización.')
ON CONFLICT ("codigo") DO NOTHING;
-- Habilitar consulta a todos los roles existentes. La edición se valida por rol institucional en la API.
INSERT INTO "rol_permiso"("rol_id", "permiso_id")
SELECT r."id", p."id" FROM "rol" r CROSS JOIN "permiso" p
WHERE p."codigo" = 'PANTALLA_CALENDARIO'
ON CONFLICT ("rol_id", "permiso_id") DO NOTHING;
