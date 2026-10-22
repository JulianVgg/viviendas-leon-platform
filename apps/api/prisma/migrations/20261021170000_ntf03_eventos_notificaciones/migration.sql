-- NTF-03: control de idempotencia para las notificaciones de calendario y visitas.
-- Se mantienen intactos los registros históricos de eventos y visitas.
ALTER TABLE "notificacion" ADD COLUMN "clave_evento" VARCHAR(191);
CREATE UNIQUE INDEX "notificacion_clave_evento_key" ON "notificacion"("clave_evento");

ALTER TABLE "evento_institucional" ADD COLUMN "version_notificacion" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "visita" ADD COLUMN "version_notificacion" INTEGER NOT NULL DEFAULT 0;

-- Los POST con el mismo UUID reutilizan el evento, no crean avisos nuevos.
ALTER TABLE "evento_institucional" ADD COLUMN "operacion_creacion_id" UUID;
CREATE UNIQUE INDEX "evento_institucional_operacion_creacion_id_key" ON "evento_institucional"("operacion_creacion_id");
