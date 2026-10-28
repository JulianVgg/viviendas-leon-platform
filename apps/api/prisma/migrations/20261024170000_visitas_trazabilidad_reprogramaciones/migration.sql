-- Historial permanente, sin alterar fechas de visitas o seguimientos ya existentes.
CREATE TABLE "visita_reprogramacion" (
  "id" SERIAL NOT NULL, "visita_id" INTEGER NOT NULL,
  "fecha_anterior" DATE NOT NULL, "fecha_nueva" DATE NOT NULL,
  "usuario_id" INTEGER NOT NULL, "motivo" TEXT,
  "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "visita_reprogramacion_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "visita_reprogramacion_visita_id_creado_en_idx" ON "visita_reprogramacion"("visita_id", "creado_en");
ALTER TABLE "visita_reprogramacion" ADD CONSTRAINT "visita_reprogramacion_visita_id_fkey" FOREIGN KEY ("visita_id") REFERENCES "visita"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "visita_reprogramacion" ADD CONSTRAINT "visita_reprogramacion_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "seguimiento_reprogramacion" (
  "id" SERIAL NOT NULL, "seguimiento_id" UUID NOT NULL,
  "fecha_anterior" DATE, "fecha_nueva" DATE NOT NULL,
  "usuario_id" INTEGER NOT NULL, "motivo" TEXT,
  "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "seguimiento_reprogramacion_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "seguimiento_reprogramacion_seguimiento_id_creado_en_idx" ON "seguimiento_reprogramacion"("seguimiento_id", "creado_en");
ALTER TABLE "seguimiento_reprogramacion" ADD CONSTRAINT "seguimiento_reprogramacion_seguimiento_id_fkey" FOREIGN KEY ("seguimiento_id") REFERENCES "visita_seguimiento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "seguimiento_reprogramacion" ADD CONSTRAINT "seguimiento_reprogramacion_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
