CREATE TABLE "ia_conversacion" (
  "id" UUID PRIMARY KEY,
  "usuario_id" INTEGER NOT NULL REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "titulo" VARCHAR(100) NOT NULL,
  "intercambios" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "version" INTEGER NOT NULL DEFAULT 0,
  "actualizado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "ia_conversacion_usuario_id_actualizado_en_idx" ON "ia_conversacion"("usuario_id", "actualizado_en");
