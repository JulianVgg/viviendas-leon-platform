ALTER TABLE "capacitacion" ADD COLUMN "usuario_responsable_id" INTEGER;
CREATE INDEX "capacitacion_usuario_responsable_id_idx" ON "capacitacion"("usuario_responsable_id");
ALTER TABLE "capacitacion" ADD CONSTRAINT "capacitacion_usuario_responsable_id_fkey" FOREIGN KEY ("usuario_responsable_id") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
