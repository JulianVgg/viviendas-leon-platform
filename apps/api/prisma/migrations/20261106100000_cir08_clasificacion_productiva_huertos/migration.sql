-- CIR-08: los huertos existentes quedan SIN CLASIFICACION, sin inferir datos desde observaciones.
ALTER TABLE "huerto"
  ADD COLUMN "entorno_cultivo" TEXT,
  ADD COLUMN "detalle_entorno" TEXT,
  ADD COLUMN "modalidades_productivas" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

ALTER TABLE "huerto"
  ADD CONSTRAINT "huerto_entorno_cultivo_chk"
    CHECK ("entorno_cultivo" IS NULL OR "entorno_cultivo" IN ('CAMPO_ABIERTO', 'MACROTUNEL', 'MIXTO', 'OTRO')),
  ADD CONSTRAINT "huerto_modalidades_productivas_chk"
    CHECK ("modalidades_productivas" <@ ARRAY['AGRICOLA','AGROFORESTAL','SILVOPASTORIL']::TEXT[]),
  ADD CONSTRAINT "huerto_detalle_entorno_chk"
    CHECK (
      ("entorno_cultivo" = 'OTRO' AND "detalle_entorno" IS NOT NULL AND
        CHAR_LENGTH(BTRIM("detalle_entorno")) BETWEEN 1 AND 180)
      OR ("entorno_cultivo" IS DISTINCT FROM 'OTRO' AND "detalle_entorno" IS NULL)
    );
