-- CreateIndex
CREATE INDEX "registro_produccion_fecha_inicio_periodo_fecha_fin_periodo_idx"
ON "registro_produccion"("fecha_inicio_periodo", "fecha_fin_periodo");

-- CreateIndex
CREATE INDEX "registro_venta_fecha_idx"
ON "registro_venta"("fecha");

-- CreateIndex
CREATE INDEX "visita_fecha_idx"
ON "visita"("fecha");

-- CreateIndex
CREATE INDEX "entrega_insumo_fecha_idx"
ON "entrega_insumo"("fecha");

-- CreateIndex
CREATE INDEX "seguimiento_tecnico_fecha_programada_idx"
ON "seguimiento_tecnico"("fecha_programada");

-- CreateIndex
CREATE INDEX "capacitacion_fecha_idx"
ON "capacitacion"("fecha");

-- CreateIndex
CREATE INDEX "alerta_estado_idx"
ON "alerta"("estado");

-- CreateIndex
CREATE INDEX "alerta_fecha_vencimiento_idx"
ON "alerta"("fecha_vencimiento");

-- CreateIndex
CREATE INDEX "bitacora_fecha_idx"
ON "bitacora"("fecha");

-- CreateIndex
CREATE INDEX "bitacora_entidad_registro_id_idx"
ON "bitacora"("entidad", "registro_id");
