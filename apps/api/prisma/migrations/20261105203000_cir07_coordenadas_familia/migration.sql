-- CIR-07. Sin ubicación confirmada se conservan ambos campos NULL.
ALTER TABLE "familia"
  ADD COLUMN "latitud" DOUBLE PRECISION,
  ADD COLUMN "longitud" DOUBLE PRECISION;

ALTER TABLE "familia"
  ADD CONSTRAINT "familia_coordenadas_pareja_chk" CHECK (
    ("latitud" IS NULL AND "longitud" IS NULL)
    OR ("latitud" IS NOT NULL AND "longitud" IS NOT NULL
      AND "latitud" BETWEEN -90 AND 90 AND "longitud" BETWEEN -180 AND 180)
  );
