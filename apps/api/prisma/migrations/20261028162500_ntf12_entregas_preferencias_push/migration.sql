-- NTF-12: preferencias de canal push (no altera preferencias de recordatorios existentes).
CREATE TABLE "preferencia_push" (
  "usuario_id" INTEGER NOT NULL,
  "habilitadas" BOOLEAN NOT NULL DEFAULT true,
  "silencio_inicio" VARCHAR(5),
  "silencio_fin" VARCHAR(5),
  "actualizado_en" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "preferencia_push_pkey" PRIMARY KEY ("usuario_id")
);

ALTER TABLE "preferencia_push" ADD CONSTRAINT "preferencia_push_usuario_id_fkey"
  FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- NTF-12: trazabilidad por notificación y por dispositivo.
CREATE TABLE "entrega_push" (
  "id" SERIAL NOT NULL,
  "notificacion_id" INTEGER NOT NULL,
  "suscripcion_id" INTEGER,
  "endpoint_hash" VARCHAR(64) NOT NULL,
  "estado" VARCHAR(16) NOT NULL DEFAULT 'PENDIENTE',
  "intentos" INTEGER NOT NULL DEFAULT 0,
  "proximo_intento" TIMESTAMPTZ(6),
  "ultimo_codigo" INTEGER,
  "ultimo_error" VARCHAR(250),
  "procesado_en" TIMESTAMPTZ(6),
  "creado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actualizado_en" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "entrega_push_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "entrega_push_notificacion_endpoint_key"
  ON "entrega_push"("notificacion_id", "endpoint_hash");
CREATE INDEX "entrega_push_pendientes_idx"
  ON "entrega_push"("estado", "proximo_intento", "id");
CREATE INDEX "entrega_push_suscripcion_id_idx"
  ON "entrega_push"("suscripcion_id");

ALTER TABLE "entrega_push" ADD CONSTRAINT "entrega_push_notificacion_id_fkey"
  FOREIGN KEY ("notificacion_id") REFERENCES "notificacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "entrega_push" ADD CONSTRAINT "entrega_push_suscripcion_id_fkey"
  FOREIGN KEY ("suscripcion_id") REFERENCES "suscripcion_push"("id") ON DELETE SET NULL ON UPDATE CASCADE;
