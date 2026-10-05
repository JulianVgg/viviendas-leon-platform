/*
  Warnings:

  - You are about to drop the column `facilitador` on the `capacitacion` table. All the data in the column will be lost.
  - You are about to drop the column `etapa_cultivo_id` on the `ciclo_cultivo` table. All the data in the column will be lost.
  - You are about to drop the column `observaciones` on the `detalle_produccion` table. All the data in the column will be lost.
  - You are about to drop the column `producto_por_planta` on the `detalle_produccion` table. All the data in the column will be lost.
  - You are about to drop the column `total_produccion` on the `detalle_produccion` table. All the data in the column will be lost.
  - You are about to drop the column `activo` on the `familia` table. All the data in the column will be lost.
  - You are about to drop the column `unidad_medida_id` on the `insumo` table. All the data in the column will be lost.
  - You are about to drop the column `total_venta` on the `precio_venta` table. All the data in the column will be lost.
  - You are about to drop the column `cantidad` on the `registro_venta` table. All the data in the column will be lost.
  - You are about to drop the column `descripcion` on the `unidad_medida` table. All the data in the column will be lost.
  - You are about to drop the column `comentario` on the `visita` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[entrega_insumo_id,insumo_id,unidad_medida_id]` on the table `detalle_entrega_insumo` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[visita_id,ciclo_cultivo_id]` on the table `evaluacion_cultivo` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[familia_id,programa_id]` on the table `familia_programa` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[categoria_insumo_id,nombre]` on the table `insumo` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `cantidad_total` to the `detalle_produccion` table without a default value. This is not possible if the table is not empty.
  - Added the required column `estado` to the `entrega_insumo` table without a default value. This is not possible if the table is not empty.
  - Made the column `usuario_responsable_id` on table `entrega_insumo` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `cantidad_vendida` to the `registro_venta` table without a default value. This is not possible if the table is not empty.
  - Made the column `usuario_responsable_id` on table `seguimiento_tecnico` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "capacitacion" DROP CONSTRAINT "capacitacion_comunidad_id_fkey";

-- DropForeignKey
ALTER TABLE "capacitacion_evidencia" DROP CONSTRAINT "capacitacion_evidencia_capacitacion_id_fkey";

-- DropForeignKey
ALTER TABLE "capacitacion_evidencia" DROP CONSTRAINT "capacitacion_evidencia_evidencia_id_fkey";

-- DropForeignKey
ALTER TABLE "ciclo_cultivo" DROP CONSTRAINT "ciclo_cultivo_etapa_cultivo_id_fkey";

-- DropForeignKey
ALTER TABLE "ciclo_cultivo" DROP CONSTRAINT "ciclo_cultivo_huerto_id_fkey";

-- DropForeignKey
ALTER TABLE "detalle_entrega_insumo" DROP CONSTRAINT "detalle_entrega_insumo_entrega_insumo_id_fkey";

-- DropForeignKey
ALTER TABLE "detalle_produccion" DROP CONSTRAINT "detalle_produccion_registro_produccion_id_fkey";

-- DropForeignKey
ALTER TABLE "entrega_insumo" DROP CONSTRAINT "entrega_insumo_usuario_responsable_id_fkey";

-- DropForeignKey
ALTER TABLE "evaluacion_cultivo" DROP CONSTRAINT "evaluacion_cultivo_ciclo_cultivo_id_fkey";

-- DropForeignKey
ALTER TABLE "evaluacion_cultivo" DROP CONSTRAINT "evaluacion_cultivo_visita_id_fkey";

-- DropForeignKey
ALTER TABLE "evaluacion_enfermedad" DROP CONSTRAINT "evaluacion_enfermedad_evaluacion_cultivo_id_fkey";

-- DropForeignKey
ALTER TABLE "evaluacion_evidencia" DROP CONSTRAINT "evaluacion_evidencia_evaluacion_cultivo_id_fkey";

-- DropForeignKey
ALTER TABLE "evaluacion_evidencia" DROP CONSTRAINT "evaluacion_evidencia_evidencia_id_fkey";

-- DropForeignKey
ALTER TABLE "evaluacion_plaga" DROP CONSTRAINT "evaluacion_plaga_evaluacion_cultivo_id_fkey";

-- DropForeignKey
ALTER TABLE "familia_programa" DROP CONSTRAINT "familia_programa_familia_id_fkey";

-- DropForeignKey
ALTER TABLE "huerto" DROP CONSTRAINT "huerto_familia_id_fkey";

-- DropForeignKey
ALTER TABLE "insumo" DROP CONSTRAINT "insumo_unidad_medida_id_fkey";

-- DropForeignKey
ALTER TABLE "integrante_familia" DROP CONSTRAINT "integrante_familia_familia_id_fkey";

-- DropForeignKey
ALTER TABLE "participacion_capacitacion" DROP CONSTRAINT "participacion_capacitacion_capacitacion_id_fkey";

-- DropForeignKey
ALTER TABLE "participacion_capacitacion" DROP CONSTRAINT "participacion_capacitacion_integrante_familia_id_fkey";

-- DropForeignKey
ALTER TABLE "precio_venta" DROP CONSTRAINT "precio_venta_registro_venta_id_fkey";

-- DropForeignKey
ALTER TABLE "registro_produccion" DROP CONSTRAINT "registro_produccion_ciclo_cultivo_id_fkey";

-- DropForeignKey
ALTER TABLE "registro_venta" DROP CONSTRAINT "registro_venta_registro_produccion_id_fkey";

-- DropForeignKey
ALTER TABLE "rol_permiso" DROP CONSTRAINT "rol_permiso_permiso_id_fkey";

-- DropForeignKey
ALTER TABLE "rol_permiso" DROP CONSTRAINT "rol_permiso_rol_id_fkey";

-- DropForeignKey
ALTER TABLE "seguimiento_tecnico" DROP CONSTRAINT "seguimiento_tecnico_evaluacion_cultivo_id_fkey";

-- DropForeignKey
ALTER TABLE "seguimiento_tecnico" DROP CONSTRAINT "seguimiento_tecnico_usuario_responsable_id_fkey";

-- DropForeignKey
ALTER TABLE "tratamiento_aplicado" DROP CONSTRAINT "tratamiento_aplicado_evaluacion_cultivo_id_fkey";

-- DropForeignKey
ALTER TABLE "usuario_rol" DROP CONSTRAINT "usuario_rol_rol_id_fkey";

-- DropForeignKey
ALTER TABLE "usuario_rol" DROP CONSTRAINT "usuario_rol_usuario_id_fkey";

-- DropForeignKey
ALTER TABLE "visita_evidencia" DROP CONSTRAINT "visita_evidencia_evidencia_id_fkey";

-- DropForeignKey
ALTER TABLE "visita_evidencia" DROP CONSTRAINT "visita_evidencia_visita_id_fkey";

-- DropIndex
DROP INDEX "alerta_estado_idx";

-- DropIndex
DROP INDEX "alerta_fecha_vencimiento_idx";

-- DropIndex
DROP INDEX "bitacora_entidad_registro_id_idx";

-- DropIndex
DROP INDEX "bitacora_fecha_idx";

-- DropIndex
DROP INDEX "capacitacion_fecha_idx";

-- DropIndex
DROP INDEX "ciclo_cultivo_etapa_cultivo_id_idx";

-- DropIndex
DROP INDEX "entrega_insumo_fecha_idx";

-- DropIndex
DROP INDEX "familia_programa_familia_id_programa_id_fecha_ingreso_key";

-- DropIndex
DROP INDEX "insumo_unidad_medida_id_idx";

-- DropIndex
DROP INDEX "registro_produccion_fecha_inicio_periodo_fecha_fin_periodo_idx";

-- DropIndex
DROP INDEX "registro_venta_fecha_idx";

-- DropIndex
DROP INDEX "seguimiento_tecnico_fecha_programada_idx";

-- DropIndex
DROP INDEX "visita_fecha_idx";

-- AlterTable
ALTER TABLE "alerta" ALTER COLUMN "tipo" SET DATA TYPE TEXT,
ALTER COLUMN "fecha_generacion" DROP DEFAULT,
ALTER COLUMN "estado" DROP DEFAULT,
ALTER COLUMN "estado" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "bitacora" ALTER COLUMN "entidad" SET DATA TYPE TEXT,
ALTER COLUMN "registro_id" SET DATA TYPE TEXT,
ALTER COLUMN "accion" SET DATA TYPE TEXT,
ALTER COLUMN "fecha" DROP DEFAULT,
ALTER COLUMN "datos_anteriores" SET DATA TYPE TEXT,
ALTER COLUMN "datos_nuevos" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "calidad" ALTER COLUMN "nombre" SET DATA TYPE TEXT,
ALTER COLUMN "activo" DROP DEFAULT;

-- AlterTable
ALTER TABLE "capacitacion" DROP COLUMN "facilitador",
ADD COLUMN     "facilitador_nombre" TEXT,
ALTER COLUMN "comunidad_id" DROP NOT NULL,
ALTER COLUMN "tema" SET DATA TYPE TEXT,
ALTER COLUMN "estado" DROP DEFAULT,
ALTER COLUMN "estado" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "categoria_insumo" ALTER COLUMN "nombre" SET DATA TYPE TEXT,
ALTER COLUMN "activo" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ciclo_cultivo" DROP COLUMN "etapa_cultivo_id",
ALTER COLUMN "estado" DROP DEFAULT,
ALTER COLUMN "estado" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "comunidad" ALTER COLUMN "nombre" SET DATA TYPE TEXT,
ALTER COLUMN "activo" DROP DEFAULT;

-- AlterTable
ALTER TABLE "condicion_climatica" ALTER COLUMN "nombre" SET DATA TYPE TEXT,
ALTER COLUMN "activo" DROP DEFAULT;

-- AlterTable
ALTER TABLE "cultivo" ALTER COLUMN "nombre" SET DATA TYPE TEXT,
ALTER COLUMN "activo" DROP DEFAULT;

-- AlterTable
ALTER TABLE "detalle_entrega_insumo" ALTER COLUMN "cantidad" SET DATA TYPE DECIMAL(65,30);

-- AlterTable
ALTER TABLE "detalle_produccion" DROP COLUMN "observaciones",
DROP COLUMN "producto_por_planta",
DROP COLUMN "total_produccion",
ADD COLUMN     "cantidad_total" DECIMAL(65,30) NOT NULL;

-- AlterTable
ALTER TABLE "enfermedad" ALTER COLUMN "nombre" SET DATA TYPE TEXT,
ALTER COLUMN "activo" DROP DEFAULT;

-- AlterTable
ALTER TABLE "entrega_insumo" ADD COLUMN     "estado" TEXT NOT NULL,
ALTER COLUMN "usuario_responsable_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "etapa_cultivo" ALTER COLUMN "nombre" SET DATA TYPE TEXT,
ALTER COLUMN "activo" DROP DEFAULT;

-- AlterTable
ALTER TABLE "evaluacion_enfermedad" ALTER COLUMN "porcentaje_danio" SET DATA TYPE DECIMAL(65,30);

-- AlterTable
ALTER TABLE "evaluacion_plaga" ALTER COLUMN "porcentaje_danio" SET DATA TYPE DECIMAL(65,30);

-- AlterTable
ALTER TABLE "evidencia" ALTER COLUMN "nombre_archivo" SET DATA TYPE TEXT,
ALTER COLUMN "ruta_archivo" SET DATA TYPE TEXT,
ALTER COLUMN "tipo_archivo" SET DATA TYPE TEXT,
ALTER COLUMN "fecha_registro" DROP DEFAULT;

-- AlterTable
ALTER TABLE "familia" DROP COLUMN "activo",
ALTER COLUMN "nombre_referencia" SET DATA TYPE TEXT,
ALTER COLUMN "estado" DROP DEFAULT,
ALTER COLUMN "estado" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "familia_programa" ALTER COLUMN "fecha_ingreso" DROP NOT NULL,
ALTER COLUMN "estado" DROP NOT NULL,
ALTER COLUMN "estado" DROP DEFAULT,
ALTER COLUMN "estado" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "huerto" ALTER COLUMN "nombre" DROP NOT NULL,
ALTER COLUMN "nombre" SET DATA TYPE TEXT,
ALTER COLUMN "tipo" SET DATA TYPE TEXT,
ALTER COLUMN "estado" DROP DEFAULT,
ALTER COLUMN "estado" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "insumo" DROP COLUMN "unidad_medida_id",
ALTER COLUMN "nombre" SET DATA TYPE TEXT,
ALTER COLUMN "activo" DROP DEFAULT;

-- AlterTable
ALTER TABLE "integrante_familia" ALTER COLUMN "nombre_completo" SET DATA TYPE TEXT,
ALTER COLUMN "sexo" SET DATA TYPE TEXT,
ALTER COLUMN "parentesco" SET DATA TYPE TEXT,
ALTER COLUMN "telefono" SET DATA TYPE TEXT,
ALTER COLUMN "activo" DROP DEFAULT;

-- AlterTable
ALTER TABLE "moneda" ALTER COLUMN "codigo" SET DATA TYPE TEXT,
ALTER COLUMN "nombre" SET DATA TYPE TEXT,
ALTER COLUMN "simbolo" SET DATA TYPE TEXT,
ALTER COLUMN "activo" DROP DEFAULT;

-- AlterTable
ALTER TABLE "municipio" ALTER COLUMN "nombre" SET DATA TYPE TEXT,
ALTER COLUMN "activo" DROP DEFAULT;

-- AlterTable
ALTER TABLE "participacion_capacitacion" ALTER COLUMN "asistio" DROP DEFAULT;

-- AlterTable
ALTER TABLE "permiso" ALTER COLUMN "codigo" SET DATA TYPE TEXT,
ALTER COLUMN "nombre" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "plaga" ALTER COLUMN "nombre" SET DATA TYPE TEXT,
ALTER COLUMN "activo" DROP DEFAULT;

-- AlterTable
ALTER TABLE "precio_venta" DROP COLUMN "total_venta",
ALTER COLUMN "precio_unitario" SET DATA TYPE DECIMAL(65,30);

-- AlterTable
ALTER TABLE "programa" ALTER COLUMN "nombre" SET DATA TYPE TEXT,
ALTER COLUMN "estado" DROP DEFAULT,
ALTER COLUMN "estado" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "registro_venta" DROP COLUMN "cantidad",
ADD COLUMN     "cantidad_vendida" DECIMAL(65,30) NOT NULL,
ALTER COLUMN "fecha" DROP NOT NULL;

-- AlterTable
ALTER TABLE "rol" ALTER COLUMN "nombre" SET DATA TYPE TEXT,
ALTER COLUMN "activo" DROP DEFAULT;

-- AlterTable
ALTER TABLE "seguimiento_tecnico" ALTER COLUMN "usuario_responsable_id" SET NOT NULL,
ALTER COLUMN "estado" DROP DEFAULT,
ALTER COLUMN "estado" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "tratamiento_aplicado" ALTER COLUMN "fecha_aplicacion" DROP NOT NULL,
ALTER COLUMN "cantidad" SET DATA TYPE DECIMAL(65,30);

-- AlterTable
ALTER TABLE "unidad_medida" DROP COLUMN "descripcion",
ADD COLUMN     "abreviatura" TEXT,
ALTER COLUMN "codigo" SET DATA TYPE TEXT,
ALTER COLUMN "nombre" SET DATA TYPE TEXT,
ALTER COLUMN "activo" DROP DEFAULT;

-- AlterTable
ALTER TABLE "usuario" ALTER COLUMN "nombre" SET DATA TYPE TEXT,
ALTER COLUMN "correo" SET DATA TYPE TEXT,
ALTER COLUMN "password_hash" SET DATA TYPE TEXT,
ALTER COLUMN "estado" DROP DEFAULT,
ALTER COLUMN "estado" SET DATA TYPE TEXT,
ALTER COLUMN "fecha_creacion" DROP DEFAULT;

-- AlterTable
ALTER TABLE "visita" DROP COLUMN "comentario",
ALTER COLUMN "tipo" SET DATA TYPE TEXT,
ALTER COLUMN "estado" DROP DEFAULT,
ALTER COLUMN "estado" SET DATA TYPE TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "detalle_entrega_insumo_entrega_insumo_id_insumo_id_unidad_m_key" ON "detalle_entrega_insumo"("entrega_insumo_id", "insumo_id", "unidad_medida_id");

-- CreateIndex
CREATE UNIQUE INDEX "evaluacion_cultivo_visita_id_ciclo_cultivo_id_key" ON "evaluacion_cultivo"("visita_id", "ciclo_cultivo_id");

-- CreateIndex
CREATE UNIQUE INDEX "familia_programa_familia_id_programa_id_key" ON "familia_programa"("familia_id", "programa_id");

-- CreateIndex
CREATE UNIQUE INDEX "insumo_categoria_insumo_id_nombre_key" ON "insumo"("categoria_insumo_id", "nombre");

-- AddForeignKey
ALTER TABLE "integrante_familia" ADD CONSTRAINT "integrante_familia_familia_id_fkey" FOREIGN KEY ("familia_id") REFERENCES "familia"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "familia_programa" ADD CONSTRAINT "familia_programa_familia_id_fkey" FOREIGN KEY ("familia_id") REFERENCES "familia"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "huerto" ADD CONSTRAINT "huerto_familia_id_fkey" FOREIGN KEY ("familia_id") REFERENCES "familia"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ciclo_cultivo" ADD CONSTRAINT "ciclo_cultivo_huerto_id_fkey" FOREIGN KEY ("huerto_id") REFERENCES "huerto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registro_produccion" ADD CONSTRAINT "registro_produccion_ciclo_cultivo_id_fkey" FOREIGN KEY ("ciclo_cultivo_id") REFERENCES "ciclo_cultivo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detalle_produccion" ADD CONSTRAINT "detalle_produccion_registro_produccion_id_fkey" FOREIGN KEY ("registro_produccion_id") REFERENCES "registro_produccion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registro_venta" ADD CONSTRAINT "registro_venta_registro_produccion_id_fkey" FOREIGN KEY ("registro_produccion_id") REFERENCES "registro_produccion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "precio_venta" ADD CONSTRAINT "precio_venta_registro_venta_id_fkey" FOREIGN KEY ("registro_venta_id") REFERENCES "registro_venta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluacion_cultivo" ADD CONSTRAINT "evaluacion_cultivo_visita_id_fkey" FOREIGN KEY ("visita_id") REFERENCES "visita"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluacion_cultivo" ADD CONSTRAINT "evaluacion_cultivo_ciclo_cultivo_id_fkey" FOREIGN KEY ("ciclo_cultivo_id") REFERENCES "ciclo_cultivo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluacion_enfermedad" ADD CONSTRAINT "evaluacion_enfermedad_evaluacion_cultivo_id_fkey" FOREIGN KEY ("evaluacion_cultivo_id") REFERENCES "evaluacion_cultivo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluacion_plaga" ADD CONSTRAINT "evaluacion_plaga_evaluacion_cultivo_id_fkey" FOREIGN KEY ("evaluacion_cultivo_id") REFERENCES "evaluacion_cultivo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tratamiento_aplicado" ADD CONSTRAINT "tratamiento_aplicado_evaluacion_cultivo_id_fkey" FOREIGN KEY ("evaluacion_cultivo_id") REFERENCES "evaluacion_cultivo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entrega_insumo" ADD CONSTRAINT "entrega_insumo_usuario_responsable_id_fkey" FOREIGN KEY ("usuario_responsable_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detalle_entrega_insumo" ADD CONSTRAINT "detalle_entrega_insumo_entrega_insumo_id_fkey" FOREIGN KEY ("entrega_insumo_id") REFERENCES "entrega_insumo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seguimiento_tecnico" ADD CONSTRAINT "seguimiento_tecnico_evaluacion_cultivo_id_fkey" FOREIGN KEY ("evaluacion_cultivo_id") REFERENCES "evaluacion_cultivo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seguimiento_tecnico" ADD CONSTRAINT "seguimiento_tecnico_usuario_responsable_id_fkey" FOREIGN KEY ("usuario_responsable_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "capacitacion" ADD CONSTRAINT "capacitacion_comunidad_id_fkey" FOREIGN KEY ("comunidad_id") REFERENCES "comunidad"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participacion_capacitacion" ADD CONSTRAINT "participacion_capacitacion_capacitacion_id_fkey" FOREIGN KEY ("capacitacion_id") REFERENCES "capacitacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participacion_capacitacion" ADD CONSTRAINT "participacion_capacitacion_integrante_familia_id_fkey" FOREIGN KEY ("integrante_familia_id") REFERENCES "integrante_familia"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visita_evidencia" ADD CONSTRAINT "visita_evidencia_visita_id_fkey" FOREIGN KEY ("visita_id") REFERENCES "visita"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visita_evidencia" ADD CONSTRAINT "visita_evidencia_evidencia_id_fkey" FOREIGN KEY ("evidencia_id") REFERENCES "evidencia"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluacion_evidencia" ADD CONSTRAINT "evaluacion_evidencia_evaluacion_cultivo_id_fkey" FOREIGN KEY ("evaluacion_cultivo_id") REFERENCES "evaluacion_cultivo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluacion_evidencia" ADD CONSTRAINT "evaluacion_evidencia_evidencia_id_fkey" FOREIGN KEY ("evidencia_id") REFERENCES "evidencia"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "capacitacion_evidencia" ADD CONSTRAINT "capacitacion_evidencia_capacitacion_id_fkey" FOREIGN KEY ("capacitacion_id") REFERENCES "capacitacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "capacitacion_evidencia" ADD CONSTRAINT "capacitacion_evidencia_evidencia_id_fkey" FOREIGN KEY ("evidencia_id") REFERENCES "evidencia"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuario_rol" ADD CONSTRAINT "usuario_rol_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuario_rol" ADD CONSTRAINT "usuario_rol_rol_id_fkey" FOREIGN KEY ("rol_id") REFERENCES "rol"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rol_permiso" ADD CONSTRAINT "rol_permiso_rol_id_fkey" FOREIGN KEY ("rol_id") REFERENCES "rol"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rol_permiso" ADD CONSTRAINT "rol_permiso_permiso_id_fkey" FOREIGN KEY ("permiso_id") REFERENCES "permiso"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
