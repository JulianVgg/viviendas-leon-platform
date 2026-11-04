-- NTF-13: consentimiento explícito de contacto por WhatsApp por integrante.
-- Los integrantes existentes permanecen sin autorización hasta que se registre.
ALTER TABLE "integrante_familia"
  ADD COLUMN "whatsapp_autorizado" BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN "whatsapp_autorizado_en" TIMESTAMPTZ(6);
