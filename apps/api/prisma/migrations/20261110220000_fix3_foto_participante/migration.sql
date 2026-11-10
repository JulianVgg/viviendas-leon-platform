-- Foto opcional de la persona de referencia; las rutas son privadas y los archivos se guardan en el volumen.
ALTER TABLE "familia" ADD COLUMN "foto_ruta" TEXT;
ALTER TABLE "familia" ADD COLUMN "foto_mime" TEXT;
ALTER TABLE "familia" ADD COLUMN "foto_actualizada_en" TIMESTAMP(3);
