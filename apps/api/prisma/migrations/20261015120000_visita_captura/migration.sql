CREATE TABLE "visita_captura" (
  "id" SERIAL NOT NULL,
  "visita_id" INTEGER NOT NULL,
  "usuario_id" INTEGER NOT NULL,
  "operation_id" UUID NOT NULL,
  "payload_hash" TEXT NOT NULL,
  "datos" JSONB NOT NULL,
  "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "visita_captura_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "visita_captura_visita_id_key" ON "visita_captura" ("visita_id");
CREATE UNIQUE INDEX "visita_captura_operation_id_key" ON "visita_captura" ("operation_id");
CREATE INDEX "visita_captura_usuario_id_idx" ON "visita_captura" ("usuario_id");
ALTER TABLE "visita_captura" ADD CONSTRAINT "visita_captura_visita_id_fkey"
  FOREIGN KEY ("visita_id") REFERENCES "visita" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
