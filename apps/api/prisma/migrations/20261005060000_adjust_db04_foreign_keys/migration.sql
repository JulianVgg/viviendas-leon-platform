-- Update referential actions defined by DB-05 and DB-06.

-- DropForeignKey
ALTER TABLE "integrante_familia" DROP CONSTRAINT "integrante_familia_familia_id_fkey";
ALTER TABLE "familia_programa" DROP CONSTRAINT "familia_programa_familia_id_fkey";
ALTER TABLE "huerto" DROP CONSTRAINT "huerto_familia_id_fkey";
ALTER TABLE "ciclo_cultivo" DROP CONSTRAINT "ciclo_cultivo_huerto_id_fkey";
ALTER TABLE "registro_produccion" DROP CONSTRAINT "registro_produccion_ciclo_cultivo_id_fkey";
ALTER TABLE "detalle_produccion" DROP CONSTRAINT "detalle_produccion_registro_produccion_id_fkey";
ALTER TABLE "registro_venta" DROP CONSTRAINT "registro_venta_registro_produccion_id_fkey";
ALTER TABLE "precio_venta" DROP CONSTRAINT "precio_venta_registro_venta_id_fkey";
ALTER TABLE "evaluacion_cultivo" DROP CONSTRAINT "evaluacion_cultivo_visita_id_fkey";
ALTER TABLE "evaluacion_cultivo" DROP CONSTRAINT "evaluacion_cultivo_ciclo_cultivo_id_fkey";
ALTER TABLE "evaluacion_enfermedad" DROP CONSTRAINT "evaluacion_enfermedad_evaluacion_cultivo_id_fkey";
ALTER TABLE "evaluacion_plaga" DROP CONSTRAINT "evaluacion_plaga_evaluacion_cultivo_id_fkey";
ALTER TABLE "tratamiento_aplicado" DROP CONSTRAINT "tratamiento_aplicado_evaluacion_cultivo_id_fkey";
ALTER TABLE "detalle_entrega_insumo" DROP CONSTRAINT "detalle_entrega_insumo_entrega_insumo_id_fkey";
ALTER TABLE "seguimiento_tecnico" DROP CONSTRAINT "seguimiento_tecnico_evaluacion_cultivo_id_fkey";
ALTER TABLE "participacion_capacitacion" DROP CONSTRAINT "participacion_capacitacion_capacitacion_id_fkey";
ALTER TABLE "participacion_capacitacion" DROP CONSTRAINT "participacion_capacitacion_integrante_familia_id_fkey";
ALTER TABLE "visita_evidencia" DROP CONSTRAINT "visita_evidencia_visita_id_fkey";
ALTER TABLE "visita_evidencia" DROP CONSTRAINT "visita_evidencia_evidencia_id_fkey";
ALTER TABLE "evaluacion_evidencia" DROP CONSTRAINT "evaluacion_evidencia_evaluacion_cultivo_id_fkey";
ALTER TABLE "evaluacion_evidencia" DROP CONSTRAINT "evaluacion_evidencia_evidencia_id_fkey";
ALTER TABLE "capacitacion_evidencia" DROP CONSTRAINT "capacitacion_evidencia_capacitacion_id_fkey";
ALTER TABLE "capacitacion_evidencia" DROP CONSTRAINT "capacitacion_evidencia_evidencia_id_fkey";
ALTER TABLE "usuario_rol" DROP CONSTRAINT "usuario_rol_usuario_id_fkey";
ALTER TABLE "usuario_rol" DROP CONSTRAINT "usuario_rol_rol_id_fkey";
ALTER TABLE "rol_permiso" DROP CONSTRAINT "rol_permiso_rol_id_fkey";
ALTER TABLE "rol_permiso" DROP CONSTRAINT "rol_permiso_permiso_id_fkey";

-- AddForeignKey
ALTER TABLE "integrante_familia" ADD CONSTRAINT "integrante_familia_familia_id_fkey" FOREIGN KEY ("familia_id") REFERENCES "familia"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "familia_programa" ADD CONSTRAINT "familia_programa_familia_id_fkey" FOREIGN KEY ("familia_id") REFERENCES "familia"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "huerto" ADD CONSTRAINT "huerto_familia_id_fkey" FOREIGN KEY ("familia_id") REFERENCES "familia"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ciclo_cultivo" ADD CONSTRAINT "ciclo_cultivo_huerto_id_fkey" FOREIGN KEY ("huerto_id") REFERENCES "huerto"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "registro_produccion" ADD CONSTRAINT "registro_produccion_ciclo_cultivo_id_fkey" FOREIGN KEY ("ciclo_cultivo_id") REFERENCES "ciclo_cultivo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "detalle_produccion" ADD CONSTRAINT "detalle_produccion_registro_produccion_id_fkey" FOREIGN KEY ("registro_produccion_id") REFERENCES "registro_produccion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "registro_venta" ADD CONSTRAINT "registro_venta_registro_produccion_id_fkey" FOREIGN KEY ("registro_produccion_id") REFERENCES "registro_produccion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "precio_venta" ADD CONSTRAINT "precio_venta_registro_venta_id_fkey" FOREIGN KEY ("registro_venta_id") REFERENCES "registro_venta"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "evaluacion_cultivo" ADD CONSTRAINT "evaluacion_cultivo_visita_id_fkey" FOREIGN KEY ("visita_id") REFERENCES "visita"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "evaluacion_cultivo" ADD CONSTRAINT "evaluacion_cultivo_ciclo_cultivo_id_fkey" FOREIGN KEY ("ciclo_cultivo_id") REFERENCES "ciclo_cultivo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "evaluacion_enfermedad" ADD CONSTRAINT "evaluacion_enfermedad_evaluacion_cultivo_id_fkey" FOREIGN KEY ("evaluacion_cultivo_id") REFERENCES "evaluacion_cultivo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "evaluacion_plaga" ADD CONSTRAINT "evaluacion_plaga_evaluacion_cultivo_id_fkey" FOREIGN KEY ("evaluacion_cultivo_id") REFERENCES "evaluacion_cultivo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tratamiento_aplicado" ADD CONSTRAINT "tratamiento_aplicado_evaluacion_cultivo_id_fkey" FOREIGN KEY ("evaluacion_cultivo_id") REFERENCES "evaluacion_cultivo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "detalle_entrega_insumo" ADD CONSTRAINT "detalle_entrega_insumo_entrega_insumo_id_fkey" FOREIGN KEY ("entrega_insumo_id") REFERENCES "entrega_insumo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "seguimiento_tecnico" ADD CONSTRAINT "seguimiento_tecnico_evaluacion_cultivo_id_fkey" FOREIGN KEY ("evaluacion_cultivo_id") REFERENCES "evaluacion_cultivo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "participacion_capacitacion" ADD CONSTRAINT "participacion_capacitacion_capacitacion_id_fkey" FOREIGN KEY ("capacitacion_id") REFERENCES "capacitacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "participacion_capacitacion" ADD CONSTRAINT "participacion_capacitacion_integrante_familia_id_fkey" FOREIGN KEY ("integrante_familia_id") REFERENCES "integrante_familia"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "visita_evidencia" ADD CONSTRAINT "visita_evidencia_visita_id_fkey" FOREIGN KEY ("visita_id") REFERENCES "visita"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "visita_evidencia" ADD CONSTRAINT "visita_evidencia_evidencia_id_fkey" FOREIGN KEY ("evidencia_id") REFERENCES "evidencia"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "evaluacion_evidencia" ADD CONSTRAINT "evaluacion_evidencia_evaluacion_cultivo_id_fkey" FOREIGN KEY ("evaluacion_cultivo_id") REFERENCES "evaluacion_cultivo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "evaluacion_evidencia" ADD CONSTRAINT "evaluacion_evidencia_evidencia_id_fkey" FOREIGN KEY ("evidencia_id") REFERENCES "evidencia"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "capacitacion_evidencia" ADD CONSTRAINT "capacitacion_evidencia_capacitacion_id_fkey" FOREIGN KEY ("capacitacion_id") REFERENCES "capacitacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "capacitacion_evidencia" ADD CONSTRAINT "capacitacion_evidencia_evidencia_id_fkey" FOREIGN KEY ("evidencia_id") REFERENCES "evidencia"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "usuario_rol" ADD CONSTRAINT "usuario_rol_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "usuario_rol" ADD CONSTRAINT "usuario_rol_rol_id_fkey" FOREIGN KEY ("rol_id") REFERENCES "rol"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "rol_permiso" ADD CONSTRAINT "rol_permiso_rol_id_fkey" FOREIGN KEY ("rol_id") REFERENCES "rol"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "rol_permiso" ADD CONSTRAINT "rol_permiso_permiso_id_fkey" FOREIGN KEY ("permiso_id") REFERENCES "permiso"("id") ON DELETE CASCADE ON UPDATE CASCADE;
