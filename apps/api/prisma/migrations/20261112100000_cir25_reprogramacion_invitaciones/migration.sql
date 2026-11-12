-- CIR-25: solicitudes de reprogramacion de invitaciones institucionales.
-- Migracion aditiva: conserva todos los eventos, participantes y respuestas existentes.

-- El nuevo estado representa una propuesta pendiente de decision del organizador.
ALTER TABLE "evento_institucional_participante"
  ALTER COLUMN "estado_invitacion" TYPE VARCHAR(16);
ALTER TABLE "evento_institucional_participante"
  DROP CONSTRAINT "evento_invitacion_estado_check";
ALTER TABLE "evento_institucional_participante"
  ADD CONSTRAINT "evento_invitacion_estado_check"
  CHECK ("estado_invitacion" IN ('ASIGNADO', 'PENDIENTE', 'ACEPTADA', 'RECHAZADA', 'REPROGRAMACION'));

CREATE TABLE "solicitud_reprogramacion_invitacion" (
  "id" SERIAL PRIMARY KEY,
  "evento_id" INTEGER NOT NULL REFERENCES "evento_institucional"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "solicitante_id" INTEGER NOT NULL REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "fecha_original" DATE NOT NULL,
  "fecha_propuesta" DATE NOT NULL,
  "version_evento" INTEGER NOT NULL,
  "motivo" VARCHAR(500) NOT NULL,
  "estado" VARCHAR(16) NOT NULL DEFAULT 'PENDIENTE',
  "resolucion" VARCHAR(20),
  "reemplazo_usuario_id" INTEGER REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "resuelto_por_id" INTEGER REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "creado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "resuelto_en" TIMESTAMPTZ(6),
  CONSTRAINT "solicitud_reprogramacion_estado_chk" CHECK ("estado" IN ('PENDIENTE', 'APROBADA', 'MANTENIDA', 'ANULADA')),
  CONSTRAINT "solicitud_reprogramacion_fechas_chk" CHECK ("fecha_original" <> "fecha_propuesta"),
  CONSTRAINT "solicitud_reprogramacion_motivo_chk" CHECK (length(btrim("motivo")) > 0),
  CONSTRAINT "solicitud_reprogramacion_resolucion_chk" CHECK ("resolucion" IS NULL OR "resolucion" IN ('OTRA_PERSONA', 'SOLO_ORGANIZADOR'))
);
CREATE INDEX "reprogramacion_inv_evento_estado_idx" ON "solicitud_reprogramacion_invitacion"("evento_id", "estado");
CREATE INDEX "reprogramacion_inv_solicitante_fecha_idx" ON "solicitud_reprogramacion_invitacion"("solicitante_id", "creado_en");

-- Impide dos propuestas abiertas simultaneas para un mismo invitado y evento.
CREATE UNIQUE INDEX "reprogramacion_inv_pendiente_unica_idx"
  ON "solicitud_reprogramacion_invitacion"("evento_id", "solicitante_id")
  WHERE "estado" = 'PENDIENTE';
