-- AI-01.2 — Auditoría de volumen de llamadas y límites diarios persistentes.
-- No se almacena el contexto de indicadores, los prompts ni las respuestas de IA.
CREATE TABLE "analisis_ia_solicitud" (
  "id" UUID NOT NULL,
  "usuario_id" INTEGER NOT NULL,
  "modelo" VARCHAR(100) NOT NULL,
  "estado" VARCHAR(24) NOT NULL DEFAULT 'RESERVADA',
  "creado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finalizado_en" TIMESTAMPTZ(6),
  "tokens_entrada" INTEGER,
  "tokens_salida" INTEGER,
  "proveedor_id" VARCHAR(100),
  CONSTRAINT "analisis_ia_solicitud_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "analisis_ia_solicitud_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "analisis_ia_solicitud_usuario_id_creado_en_idx" ON "analisis_ia_solicitud"("usuario_id", "creado_en");
CREATE INDEX "analisis_ia_solicitud_creado_en_idx" ON "analisis_ia_solicitud"("creado_en");
