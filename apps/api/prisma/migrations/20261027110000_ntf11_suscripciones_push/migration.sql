-- CreateTable
CREATE TABLE "suscripcion_push" (
    "id" SERIAL NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "endpoint" TEXT NOT NULL,
    "endpoint_hash" VARCHAR(64) NOT NULL,
    "clave_p256dh" TEXT NOT NULL,
    "clave_auth" TEXT NOT NULL,
    "navegador" VARCHAR(120),
    "fecha_creacion" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_actualizacion" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "suscripcion_push_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "suscripcion_push_endpoint_hash_key" ON "suscripcion_push"("endpoint_hash");

-- CreateIndex
CREATE INDEX "suscripcion_push_usuario_id_idx" ON "suscripcion_push"("usuario_id");

-- AddForeignKey
ALTER TABLE "suscripcion_push" ADD CONSTRAINT "suscripcion_push_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
