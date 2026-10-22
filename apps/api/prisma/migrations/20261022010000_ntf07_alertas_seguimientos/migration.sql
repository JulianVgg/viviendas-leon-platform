-- NTF-07: cola duradera de alertas para compromisos VIS-04.
CREATE TABLE "aviso_seguimiento" (
  "id" SERIAL PRIMARY KEY,
  "seguimiento_id" UUID NOT NULL,
  "usuario_id" INTEGER NOT NULL,
  "tipo" VARCHAR(16) NOT NULL,
  "fecha_limite" DATE NOT NULL,
  "fecha_programada" TIMESTAMPTZ(6) NOT NULL,
  "estado" VARCHAR(15) NOT NULL DEFAULT 'PENDIENTE',
  "intentos" INTEGER NOT NULL DEFAULT 0,
  "proximo_intento" TIMESTAMPTZ(6),
  "ultimo_error" VARCHAR(500),
  "procesado_en" TIMESTAMPTZ(6),
  "creado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "aviso_seguimiento_seguimiento_fk" FOREIGN KEY ("seguimiento_id") REFERENCES "visita_seguimiento"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "aviso_seguimiento_usuario_fk" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "aviso_seguimiento_tipo_check" CHECK ("tipo" IN ('PROXIMO', 'VENCIDO')),
  CONSTRAINT "aviso_seguimiento_estado_check" CHECK ("estado" IN ('PENDIENTE', 'ENVIADO', 'CANCELADO', 'ERROR'))
);
CREATE UNIQUE INDEX "aviso_seguimiento_unico" ON "aviso_seguimiento"
  ("seguimiento_id", "usuario_id", "tipo", "fecha_limite");
CREATE INDEX "aviso_seguimiento_programado_idx" ON "aviso_seguimiento"
  ("estado", "proximo_intento", "fecha_programada");
CREATE INDEX "aviso_seguimiento_usuario_idx" ON "aviso_seguimiento"
  ("usuario_id", "estado");
