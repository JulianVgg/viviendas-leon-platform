-- CAP-02: asistencia de familias a capacitaciones.
-- Nueva tabla independiente: conserva participacion_capacitacion por integrante.
CREATE TABLE "asistencia_familia_capacitacion" (
  "id" SERIAL NOT NULL,
  "capacitacion_id" INTEGER NOT NULL,
  "familia_id" INTEGER NOT NULL,
  "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "asistencia_familia_capacitacion_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "asistencia_familia_capacitacion_capacitacion_id_familia_id_key"
  ON "asistencia_familia_capacitacion"("capacitacion_id", "familia_id");
CREATE INDEX "asistencia_familia_capacitacion_familia_id_idx"
  ON "asistencia_familia_capacitacion"("familia_id");
ALTER TABLE "asistencia_familia_capacitacion"
  ADD CONSTRAINT "asistencia_familia_capacitacion_capacitacion_id_fkey"
  FOREIGN KEY ("capacitacion_id") REFERENCES "capacitacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "asistencia_familia_capacitacion"
  ADD CONSTRAINT "asistencia_familia_capacitacion_familia_id_fkey"
  FOREIGN KEY ("familia_id") REFERENCES "familia"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
