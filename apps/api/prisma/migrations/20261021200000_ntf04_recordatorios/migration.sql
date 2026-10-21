-- NTF-04: almacenamiento de recordatorios y preferencias, sin generar envíos.
ALTER TABLE "evento_institucional" ADD COLUMN "recordatorios_config" JSONB;
ALTER TABLE "visita" ADD COLUMN "recordatorios_config" JSONB;

CREATE TABLE "preferencia_recordatorio" (
    "usuario_id" INTEGER NOT NULL PRIMARY KEY,
    "anticipaciones" TEXT[] NOT NULL DEFAULT ARRAY['DIA_ANTES']::TEXT[],
    "actualizado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "preferencia_recordatorio_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "recordatorio" (
    "id" SERIAL NOT NULL PRIMARY KEY,
    "usuario_id" INTEGER NOT NULL,
    "tipo_origen" VARCHAR(12) NOT NULL,
    "origen_id" INTEGER NOT NULL,
    "clave" VARCHAR(80) NOT NULL,
    "fecha_programada" TIMESTAMPTZ(6) NOT NULL,
    "estado" VARCHAR(15) NOT NULL DEFAULT 'PENDIENTE',
    "creado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "recordatorio_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "recordatorio_tipo_check" CHECK ("tipo_origen" IN ('CALENDARIO','VISITA')),
    CONSTRAINT "recordatorio_estado_check" CHECK ("estado" IN ('PENDIENTE','CANCELADO','ENVIADO'))
);
CREATE UNIQUE INDEX "recordatorio_origen_destinatario_clave_key" ON "recordatorio" ("tipo_origen", "origen_id", "usuario_id", "clave");
CREATE INDEX "recordatorio_pendiente_idx" ON "recordatorio" ("estado", "fecha_programada");
CREATE INDEX "recordatorio_usuario_estado_idx" ON "recordatorio" ("usuario_id", "estado");
