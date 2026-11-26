-- FIN-01: libros contables operativos. No importa datos de los ejemplos ni altera movimientos agrícolas.
CREATE TABLE "fin_cuenta" (
  "id" SERIAL PRIMARY KEY,
  "tipo" VARCHAR(20) NOT NULL CHECK ("tipo" IN ('BANCO', 'CAJA_CHICA', 'FONDO_MEDICO')),
  "nombre" VARCHAR(100) NOT NULL,
  "referencia" VARCHAR(40),
  "saldo_inicial" NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK ("saldo_inicial" >= 0),
  "fecha_apertura" DATE NOT NULL,
  "activo" BOOLEAN NOT NULL DEFAULT TRUE,
  "creado_en" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "creado_por_id" INTEGER NOT NULL REFERENCES "usuario"("id") ON DELETE RESTRICT
);
CREATE INDEX "fin_cuenta_tipo_activo_idx" ON "fin_cuenta"("tipo", "activo");

CREATE TABLE "fin_subcuenta" (
  "id" SERIAL PRIMARY KEY,
  "cuenta_id" INTEGER NOT NULL REFERENCES "fin_cuenta"("id") ON DELETE RESTRICT,
  "nombre" VARCHAR(100) NOT NULL,
  "saldo_inicial" NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK ("saldo_inicial" >= 0),
  "activa" BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE ("cuenta_id", "nombre")
);
CREATE INDEX "fin_subcuenta_cuenta_id_activa_idx" ON "fin_subcuenta"("cuenta_id", "activa");

CREATE TABLE "fin_categoria" (
  "id" SERIAL PRIMARY KEY,
  "nombre" VARCHAR(100) NOT NULL UNIQUE,
  "grupo" VARCHAR(40) NOT NULL,
  "activa" BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE "fin_movimiento" (
  "id" SERIAL PRIMARY KEY,
  "cuenta_id" INTEGER NOT NULL REFERENCES "fin_cuenta"("id") ON DELETE RESTRICT,
  "subcuenta_id" INTEGER REFERENCES "fin_subcuenta"("id") ON DELETE RESTRICT,
  "categoria_id" INTEGER REFERENCES "fin_categoria"("id") ON DELETE RESTRICT,
  "fecha" DATE NOT NULL,
  "tipo" VARCHAR(12) NOT NULL CHECK ("tipo" IN ('INGRESO', 'EGRESO')),
  "importe" NUMERIC(14,2) NOT NULL CHECK ("importe" > 0),
  "descripcion" VARCHAR(500) NOT NULL,
  "referencia" VARCHAR(80),
  "beneficiario" VARCHAR(120),
  "traslado_id" UUID,
  "creado_por_id" INTEGER NOT NULL REFERENCES "usuario"("id") ON DELETE RESTRICT,
  "creado_en" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "anulado_en" TIMESTAMPTZ,
  "anulado_por_id" INTEGER REFERENCES "usuario"("id") ON DELETE RESTRICT,
  "motivo_anulacion" VARCHAR(300),
  CHECK (("anulado_en" IS NULL AND "anulado_por_id" IS NULL) OR ("anulado_en" IS NOT NULL AND "anulado_por_id" IS NOT NULL))
);
CREATE INDEX "fin_movimiento_cuenta_id_fecha_id_idx" ON "fin_movimiento"("cuenta_id", "fecha", "id");
CREATE INDEX "fin_movimiento_subcuenta_id_fecha_idx" ON "fin_movimiento"("subcuenta_id", "fecha");
CREATE INDEX "fin_movimiento_traslado_id_idx" ON "fin_movimiento"("traslado_id");

CREATE TABLE "fin_comprobante" (
  "id" SERIAL PRIMARY KEY,
  "movimiento_id" INTEGER NOT NULL UNIQUE REFERENCES "fin_movimiento"("id") ON DELETE RESTRICT,
  "nombre" VARCHAR(120) NOT NULL,
  "mime" VARCHAR(40) NOT NULL CHECK ("mime" IN ('application/pdf', 'image/jpeg', 'image/png')),
  "contenido" BYTEA NOT NULL CHECK (OCTET_LENGTH("contenido") BETWEEN 1 AND 5242880),
  "creado_en" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "creado_por_id" INTEGER NOT NULL REFERENCES "usuario"("id") ON DELETE RESTRICT
);

INSERT INTO "fin_categoria" ("nombre", "grupo") VALUES
('Transferencias recibidas', 'INGRESOS'),
('Donaciones y fondos', 'INGRESOS'),
('Intereses bancarios', 'INGRESOS'),
('Servicios profesionales', 'GASTOS'),
('Gastos administrativos', 'GASTOS'),
('Huertos e insumos', 'GASTOS'),
('Transporte y alimentación', 'GASTOS'),
('Caja chica', 'GASTOS'),
('Gastos médicos', 'GASTOS'),
('Comisiones e impuestos', 'GASTOS'),
('Mantenimiento y equipo', 'GASTOS'),
('Otros ingresos', 'INGRESOS'),
('Otros gastos', 'GASTOS')
ON CONFLICT ("nombre") DO NOTHING;

INSERT INTO "permiso" ("codigo", "nombre", "descripcion") VALUES
('PANTALLA_FINANZAS_BANCOS', 'Bancos', 'Consulta de movimientos y saldos bancarios'),
('PANTALLA_FINANZAS_CAJA', 'Caja chica', 'Consulta de gastos y reposiciones de caja chica'),
('PANTALLA_FINANZAS_MEDICOS', 'Fondos médicos', 'Consulta de cuentas y movimientos médicos de carácter restringido'),
('PANTALLA_FINANZAS_INFORME', 'Informe mensual financiero', 'Consulta y exportación del resumen mensual'),
('FINANZAS_WRITE', 'Registrar operaciones financieras', 'Alta de cuentas, subcuentas y movimientos; sin aprobaciones'),
('FINANZAS_ANULAR', 'Anular operaciones financieras', 'Anulación trazable de movimientos sin eliminación')
ON CONFLICT ("codigo") DO NOTHING;

INSERT INTO "rol_permiso" ("rol_id", "permiso_id")
SELECT r."id", p."id" FROM "rol" r JOIN "permiso" p ON p."codigo" IN (
  'PANTALLA_FINANZAS_BANCOS','PANTALLA_FINANZAS_CAJA','PANTALLA_FINANZAS_MEDICOS','PANTALLA_FINANZAS_INFORME')
WHERE r."nombre" IN ('Dirección general','Contadora interna','Auditor')
ON CONFLICT DO NOTHING;
INSERT INTO "rol_permiso" ("rol_id", "permiso_id")
SELECT r."id", p."id" FROM "rol" r JOIN "permiso" p ON p."codigo" IN ('FINANZAS_WRITE','FINANZAS_ANULAR')
WHERE r."nombre" = 'Contadora interna'
ON CONFLICT DO NOTHING;
