-- NTF-05: metadatos para procesamiento durable, registro de error y backoff.
ALTER TABLE "recordatorio"
    ADD COLUMN "intentos" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN "proximo_intento" TIMESTAMPTZ(6),
    ADD COLUMN "ultimo_error" VARCHAR(500),
    ADD COLUMN "procesado_en" TIMESTAMPTZ(6);

ALTER TABLE "recordatorio" DROP CONSTRAINT "recordatorio_estado_check";
ALTER TABLE "recordatorio" ADD CONSTRAINT "recordatorio_estado_check"
    CHECK ("estado" IN ('PENDIENTE', 'CANCELADO', 'ENVIADO', 'ERROR'));

CREATE INDEX "recordatorio_reintentos_idx"
    ON "recordatorio" ("estado", "proximo_intento", "fecha_programada");
