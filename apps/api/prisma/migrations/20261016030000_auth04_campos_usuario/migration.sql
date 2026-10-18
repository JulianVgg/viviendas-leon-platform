
-- AUTH-04: Nuevos campos para administrar usuarios
-- Conserva los usuarios y las relaciones existentes.

ALTER TABLE "usuario"
  ADD COLUMN "apellido" TEXT,
  ADD COLUMN "telefono" TEXT,
  ADD COLUMN "debe_cambiar_password" BOOLEAN NOT NULL DEFAULT false;
