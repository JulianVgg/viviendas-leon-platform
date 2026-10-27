-- NTF-09: conservar las asignaciones anteriores y registrar las respuestas nuevas.
-- Este cambio no elimina ni modifica las filas de participantes existentes.
ALTER TABLE "evento_institucional_participante"
  ADD COLUMN "estado_invitacion" VARCHAR(12) NOT NULL DEFAULT 'ASIGNADO',
  ADD COLUMN "respondida_en" TIMESTAMPTZ(6);

ALTER TABLE "evento_institucional_participante"
  ADD CONSTRAINT "evento_invitacion_estado_check"
  CHECK ("estado_invitacion" IN ('ASIGNADO', 'PENDIENTE', 'ACEPTADA', 'RECHAZADA'));
