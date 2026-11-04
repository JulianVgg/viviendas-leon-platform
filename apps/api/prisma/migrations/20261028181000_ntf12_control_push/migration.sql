-- NTF-12: no reenviar avisos históricos al habilitar el procesador por primera vez.
CREATE TABLE "control_push" (
  "id" INTEGER NOT NULL,
  "activado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ultimo_escaneo" TIMESTAMPTZ(6),
  CONSTRAINT "control_push_pkey" PRIMARY KEY ("id")
);
INSERT INTO "control_push" ("id") VALUES (1);
CREATE INDEX "notificacion_fecha_creacion_id_push_idx"
  ON "notificacion"("fecha_creacion", "id");
