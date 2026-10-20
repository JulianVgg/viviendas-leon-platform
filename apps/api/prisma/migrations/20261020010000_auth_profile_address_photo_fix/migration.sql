
-- AUTH: Corrección de Dirección y Fotografía
-- Migración aditiva, sin eliminar datos existentes.

BEGIN;

-- Agregar información de dirección al usuario.
ALTER TABLE "usuario"
ADD COLUMN "departamento" VARCHAR(100),
ADD COLUMN "municipio" VARCHAR(100),
ADD COLUMN "direccion" VARCHAR(255);

-- Crear tabla para almacenar fotografías.
CREATE TABLE "usuario_foto_perfil" (
    "usuario_id" INTEGER NOT NULL,
    "mime_type" VARCHAR(30) NOT NULL,
    "contenido" BYTEA NOT NULL,
    "actualizada_en" TIMESTAMP(3) NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuario_foto_perfil_pkey"
        PRIMARY KEY ("usuario_id")
);

-- Relacionar fotografía y usuario.
ALTER TABLE "usuario_foto_perfil"
ADD CONSTRAINT "usuario_foto_perfil_usuario_id_fkey"
FOREIGN KEY ("usuario_id")
REFERENCES "usuario"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

COMMIT;
