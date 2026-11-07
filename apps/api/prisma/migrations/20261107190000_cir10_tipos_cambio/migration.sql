-- CIR-10: una tasa GTQ por USD para cada fecha de operacion.
-- Sin tasa historica, no hay equivalencia; no se modifica la moneda de la venta.
CREATE TABLE "tipo_cambio" (
    "id" SERIAL NOT NULL,
    "fecha" DATE NOT NULL,
    "quetzales_por_dolar" DECIMAL(18,6) NOT NULL,
    "fuente" VARCHAR(120) NOT NULL,
    "referencia" VARCHAR(250) NOT NULL,
    "usuario_registro_id" INTEGER,
    "creado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "tipo_cambio_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "tipo_cambio_quetzales_por_dolar_check" CHECK ("quetzales_por_dolar" > 0),
    CONSTRAINT "tipo_cambio_fuente_check" CHECK (length(btrim("fuente")) > 0),
    CONSTRAINT "tipo_cambio_referencia_check" CHECK (length(btrim("referencia")) > 0)
);
CREATE UNIQUE INDEX "tipo_cambio_fecha_key" ON "tipo_cambio"("fecha");
ALTER TABLE "tipo_cambio" ADD CONSTRAINT "tipo_cambio_usuario_registro_id_fkey"
  FOREIGN KEY ("usuario_registro_id") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Solo Direccion (acceso general) y Coordinacion pueden registrar tasas.
-- El tecnico mantiene PRODUCCION_WRITE sin adquirir este permiso.
INSERT INTO "permiso" ("codigo", "nombre", "descripcion") VALUES
  ('TIPO_CAMBIO_WRITE', 'Registrar tipos de cambio', 'Registrar tasas historicas documentadas para conversiones institucionales.')
ON CONFLICT ("codigo") DO NOTHING;
INSERT INTO "rol_permiso" ("rol_id", "permiso_id")
SELECT r."id", p."id" FROM "rol" r CROSS JOIN "permiso" p
WHERE r."nombre" = 'Coordinadora del programa agroforestal' AND p."codigo" = 'TIPO_CAMBIO_WRITE'
ON CONFLICT ("rol_id", "permiso_id") DO NOTHING;
