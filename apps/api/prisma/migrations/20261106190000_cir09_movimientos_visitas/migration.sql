-- CIR-09: trazabilidad opcional sin modificar registros históricos.
ALTER TABLE "registro_produccion" ADD COLUMN "visita_origen_id" INTEGER;
ALTER TABLE "registro_venta" ADD COLUMN "visita_origen_id" INTEGER;
CREATE INDEX "registro_produccion_visita_origen_id_idx" ON "registro_produccion"("visita_origen_id");
CREATE INDEX "registro_venta_visita_origen_id_idx" ON "registro_venta"("visita_origen_id");
ALTER TABLE "registro_produccion" ADD CONSTRAINT "registro_produccion_visita_origen_id_fkey" FOREIGN KEY ("visita_origen_id") REFERENCES "visita"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "registro_venta" ADD CONSTRAINT "registro_venta_visita_origen_id_fkey" FOREIGN KEY ("visita_origen_id") REFERENCES "visita"("id") ON DELETE SET NULL ON UPDATE CASCADE;
