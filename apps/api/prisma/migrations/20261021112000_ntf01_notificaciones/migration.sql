-- NTF-01: Bandeja de notificaciones individuales.
-- Independiente de la tabla alerta (alertas operativas de familias/visitas).
CREATE TABLE "notificacion" (
    "id" SERIAL NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "tipo" VARCHAR(50) NOT NULL,
    "titulo" VARCHAR(160) NOT NULL,
    "mensaje" TEXT NOT NULL,
    "referencia" VARCHAR(255),
    "fecha_creacion" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_lectura" TIMESTAMPTZ(6),
    CONSTRAINT "notificacion_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "notificacion_usuario_id_fkey"
      FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id")
      ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "notificacion_usuario_id_fecha_creacion_id_idx"
    ON "notificacion"("usuario_id", "fecha_creacion" DESC, "id" DESC);
CREATE INDEX "notificacion_usuario_id_fecha_lectura_idx"
    ON "notificacion"("usuario_id", "fecha_lectura");
