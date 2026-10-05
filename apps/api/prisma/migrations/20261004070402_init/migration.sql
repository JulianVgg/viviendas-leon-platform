-- CreateTable
CREATE TABLE "municipio" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "municipio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comunidad" (
    "id" SERIAL NOT NULL,
    "municipio_id" INTEGER NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "comunidad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "familia" (
    "id" SERIAL NOT NULL,
    "comunidad_id" INTEGER NOT NULL,
    "nombre_referencia" VARCHAR(150) NOT NULL,
    "fecha_ingreso" DATE,
    "estado" VARCHAR(30) NOT NULL DEFAULT 'ACTIVA',
    "observaciones" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "familia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integrante_familia" (
    "id" SERIAL NOT NULL,
    "familia_id" INTEGER NOT NULL,
    "nombre_completo" VARCHAR(200) NOT NULL,
    "fecha_nacimiento" DATE,
    "sexo" VARCHAR(30),
    "parentesco" VARCHAR(100),
    "telefono" VARCHAR(30),
    "observaciones" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "integrante_familia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "programa" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(150) NOT NULL,
    "descripcion" TEXT,
    "fecha_inicio" DATE,
    "fecha_fin" DATE,
    "estado" VARCHAR(30) NOT NULL DEFAULT 'ACTIVO',

    CONSTRAINT "programa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "familia_programa" (
    "id" SERIAL NOT NULL,
    "familia_id" INTEGER NOT NULL,
    "programa_id" INTEGER NOT NULL,
    "fecha_ingreso" DATE NOT NULL,
    "fecha_salida" DATE,
    "estado" VARCHAR(30) NOT NULL DEFAULT 'ACTIVO',
    "observaciones" TEXT,

    CONSTRAINT "familia_programa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "huerto" (
    "id" SERIAL NOT NULL,
    "familia_id" INTEGER NOT NULL,
    "nombre" VARCHAR(150) NOT NULL,
    "tipo" VARCHAR(100),
    "fecha_inicio" DATE,
    "estado" VARCHAR(30) NOT NULL DEFAULT 'ACTIVO',
    "observaciones" TEXT,

    CONSTRAINT "huerto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cultivo" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "descripcion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "cultivo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "etapa_cultivo" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "descripcion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "etapa_cultivo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ciclo_cultivo" (
    "id" SERIAL NOT NULL,
    "huerto_id" INTEGER NOT NULL,
    "cultivo_id" INTEGER NOT NULL,
    "etapa_cultivo_id" INTEGER,
    "fecha_siembra" DATE,
    "fecha_trasplante" DATE,
    "cantidad_plantas" INTEGER,
    "fecha_fin" DATE,
    "estado" VARCHAR(30) NOT NULL DEFAULT 'ACTIVO',
    "observaciones" TEXT,

    CONSTRAINT "ciclo_cultivo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unidad_medida" (
    "id" SERIAL NOT NULL,
    "codigo" VARCHAR(30) NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "descripcion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "unidad_medida_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "moneda" (
    "id" SERIAL NOT NULL,
    "codigo" VARCHAR(10) NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "simbolo" VARCHAR(10),
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "moneda_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registro_produccion" (
    "id" SERIAL NOT NULL,
    "ciclo_cultivo_id" INTEGER NOT NULL,
    "fecha_inicio_periodo" DATE NOT NULL,
    "fecha_fin_periodo" DATE NOT NULL,
    "observaciones" TEXT,

    CONSTRAINT "registro_produccion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "detalle_produccion" (
    "id" SERIAL NOT NULL,
    "registro_produccion_id" INTEGER NOT NULL,
    "unidad_medida_id" INTEGER NOT NULL,
    "producto_por_planta" DECIMAL(12,2),
    "total_produccion" DECIMAL(12,2),
    "observaciones" TEXT,

    CONSTRAINT "detalle_produccion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registro_venta" (
    "id" SERIAL NOT NULL,
    "registro_produccion_id" INTEGER NOT NULL,
    "unidad_medida_id" INTEGER NOT NULL,
    "fecha" DATE NOT NULL,
    "cantidad" DECIMAL(12,2) NOT NULL,
    "observaciones" TEXT,

    CONSTRAINT "registro_venta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "precio_venta" (
    "id" SERIAL NOT NULL,
    "registro_venta_id" INTEGER NOT NULL,
    "moneda_id" INTEGER NOT NULL,
    "precio_unitario" DECIMAL(12,2) NOT NULL,
    "total_venta" DECIMAL(12,2),

    CONSTRAINT "precio_venta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "condicion_climatica" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "condicion_climatica_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visita" (
    "id" SERIAL NOT NULL,
    "familia_id" INTEGER NOT NULL,
    "usuario_responsable_id" INTEGER NOT NULL,
    "condicion_climatica_id" INTEGER,
    "fecha" DATE NOT NULL,
    "hora_inicio" TIME(0),
    "hora_fin" TIME(0),
    "tipo" VARCHAR(50),
    "estado" VARCHAR(30) NOT NULL DEFAULT 'PROGRAMADA',
    "comentario" TEXT,
    "observaciones" TEXT,

    CONSTRAINT "visita_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calidad" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "calidad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evaluacion_cultivo" (
    "id" SERIAL NOT NULL,
    "visita_id" INTEGER NOT NULL,
    "ciclo_cultivo_id" INTEGER NOT NULL,
    "etapa_cultivo_id" INTEGER,
    "calidad_id" INTEGER,
    "observaciones" TEXT,

    CONSTRAINT "evaluacion_cultivo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enfermedad" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "descripcion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "enfermedad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evaluacion_enfermedad" (
    "id" SERIAL NOT NULL,
    "evaluacion_cultivo_id" INTEGER NOT NULL,
    "enfermedad_id" INTEGER NOT NULL,
    "porcentaje_danio" DECIMAL(5,2),
    "observaciones" TEXT,

    CONSTRAINT "evaluacion_enfermedad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plaga" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "descripcion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "plaga_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evaluacion_plaga" (
    "id" SERIAL NOT NULL,
    "evaluacion_cultivo_id" INTEGER NOT NULL,
    "plaga_id" INTEGER NOT NULL,
    "porcentaje_danio" DECIMAL(5,2),
    "observaciones" TEXT,

    CONSTRAINT "evaluacion_plaga_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categoria_insumo" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "descripcion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "categoria_insumo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "insumo" (
    "id" SERIAL NOT NULL,
    "categoria_insumo_id" INTEGER NOT NULL,
    "unidad_medida_id" INTEGER,
    "nombre" VARCHAR(150) NOT NULL,
    "descripcion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "insumo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tratamiento_aplicado" (
    "id" SERIAL NOT NULL,
    "evaluacion_cultivo_id" INTEGER NOT NULL,
    "insumo_id" INTEGER NOT NULL,
    "unidad_medida_id" INTEGER,
    "fecha_aplicacion" DATE NOT NULL,
    "cantidad" DECIMAL(12,2),
    "observaciones" TEXT,

    CONSTRAINT "tratamiento_aplicado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entrega_insumo" (
    "id" SERIAL NOT NULL,
    "familia_id" INTEGER NOT NULL,
    "usuario_responsable_id" INTEGER,
    "fecha" DATE NOT NULL,
    "observaciones" TEXT,

    CONSTRAINT "entrega_insumo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "detalle_entrega_insumo" (
    "id" SERIAL NOT NULL,
    "entrega_insumo_id" INTEGER NOT NULL,
    "insumo_id" INTEGER NOT NULL,
    "unidad_medida_id" INTEGER NOT NULL,
    "cantidad" DECIMAL(12,2) NOT NULL,
    "observaciones" TEXT,

    CONSTRAINT "detalle_entrega_insumo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seguimiento_tecnico" (
    "id" SERIAL NOT NULL,
    "evaluacion_cultivo_id" INTEGER NOT NULL,
    "usuario_responsable_id" INTEGER,
    "recomendacion" TEXT NOT NULL,
    "fecha_programada" DATE,
    "fecha_realizada" DATE,
    "estado" VARCHAR(30) NOT NULL DEFAULT 'PENDIENTE',
    "resultado" TEXT,
    "observaciones" TEXT,

    CONSTRAINT "seguimiento_tecnico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "capacitacion" (
    "id" SERIAL NOT NULL,
    "comunidad_id" INTEGER NOT NULL,
    "tema" VARCHAR(200) NOT NULL,
    "descripcion" TEXT,
    "fecha" DATE NOT NULL,
    "hora_inicio" TIME(0),
    "hora_fin" TIME(0),
    "facilitador" VARCHAR(200),
    "observaciones" TEXT,
    "estado" VARCHAR(30) NOT NULL DEFAULT 'PROGRAMADA',

    CONSTRAINT "capacitacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "participacion_capacitacion" (
    "id" SERIAL NOT NULL,
    "capacitacion_id" INTEGER NOT NULL,
    "integrante_familia_id" INTEGER NOT NULL,
    "asistio" BOOLEAN NOT NULL DEFAULT false,
    "observaciones" TEXT,

    CONSTRAINT "participacion_capacitacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evidencia" (
    "id" SERIAL NOT NULL,
    "nombre_archivo" VARCHAR(255) NOT NULL,
    "ruta_archivo" VARCHAR(500) NOT NULL,
    "tipo_archivo" VARCHAR(100),
    "descripcion" TEXT,
    "fecha_registro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evidencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visita_evidencia" (
    "visita_id" INTEGER NOT NULL,
    "evidencia_id" INTEGER NOT NULL,

    CONSTRAINT "visita_evidencia_pkey" PRIMARY KEY ("visita_id","evidencia_id")
);

-- CreateTable
CREATE TABLE "evaluacion_evidencia" (
    "evaluacion_cultivo_id" INTEGER NOT NULL,
    "evidencia_id" INTEGER NOT NULL,

    CONSTRAINT "evaluacion_evidencia_pkey" PRIMARY KEY ("evaluacion_cultivo_id","evidencia_id")
);

-- CreateTable
CREATE TABLE "capacitacion_evidencia" (
    "capacitacion_id" INTEGER NOT NULL,
    "evidencia_id" INTEGER NOT NULL,

    CONSTRAINT "capacitacion_evidencia_pkey" PRIMARY KEY ("capacitacion_id","evidencia_id")
);

-- CreateTable
CREATE TABLE "alerta" (
    "id" SERIAL NOT NULL,
    "familia_id" INTEGER,
    "visita_id" INTEGER,
    "seguimiento_tecnico_id" INTEGER,
    "tipo" VARCHAR(100) NOT NULL,
    "descripcion" TEXT NOT NULL,
    "fecha_generacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_vencimiento" TIMESTAMP(3),
    "estado" VARCHAR(30) NOT NULL DEFAULT 'PENDIENTE',
    "fecha_resolucion" TIMESTAMP(3),

    CONSTRAINT "alerta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuario" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(150) NOT NULL,
    "correo" VARCHAR(150) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "estado" VARCHAR(30) NOT NULL DEFAULT 'ACTIVO',
    "ultimo_acceso" TIMESTAMP(3),
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rol" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "descripcion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "rol_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permiso" (
    "id" SERIAL NOT NULL,
    "codigo" VARCHAR(100) NOT NULL,
    "nombre" VARCHAR(150) NOT NULL,
    "descripcion" TEXT,

    CONSTRAINT "permiso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuario_rol" (
    "usuario_id" INTEGER NOT NULL,
    "rol_id" INTEGER NOT NULL,

    CONSTRAINT "usuario_rol_pkey" PRIMARY KEY ("usuario_id","rol_id")
);

-- CreateTable
CREATE TABLE "rol_permiso" (
    "rol_id" INTEGER NOT NULL,
    "permiso_id" INTEGER NOT NULL,

    CONSTRAINT "rol_permiso_pkey" PRIMARY KEY ("rol_id","permiso_id")
);

-- CreateTable
CREATE TABLE "bitacora" (
    "id" SERIAL NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "entidad" VARCHAR(100) NOT NULL,
    "registro_id" INTEGER,
    "accion" VARCHAR(50) NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "datos_anteriores" JSONB,
    "datos_nuevos" JSONB,
    "descripcion" TEXT,

    CONSTRAINT "bitacora_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "municipio_nombre_key" ON "municipio"("nombre");

-- CreateIndex
CREATE INDEX "comunidad_municipio_id_idx" ON "comunidad"("municipio_id");

-- CreateIndex
CREATE UNIQUE INDEX "comunidad_municipio_id_nombre_key" ON "comunidad"("municipio_id", "nombre");

-- CreateIndex
CREATE INDEX "familia_comunidad_id_idx" ON "familia"("comunidad_id");

-- CreateIndex
CREATE INDEX "integrante_familia_familia_id_idx" ON "integrante_familia"("familia_id");

-- CreateIndex
CREATE UNIQUE INDEX "programa_nombre_key" ON "programa"("nombre");

-- CreateIndex
CREATE INDEX "familia_programa_familia_id_idx" ON "familia_programa"("familia_id");

-- CreateIndex
CREATE INDEX "familia_programa_programa_id_idx" ON "familia_programa"("programa_id");

-- CreateIndex
CREATE UNIQUE INDEX "familia_programa_familia_id_programa_id_fecha_ingreso_key" ON "familia_programa"("familia_id", "programa_id", "fecha_ingreso");

-- CreateIndex
CREATE INDEX "huerto_familia_id_idx" ON "huerto"("familia_id");

-- CreateIndex
CREATE UNIQUE INDEX "cultivo_nombre_key" ON "cultivo"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "etapa_cultivo_nombre_key" ON "etapa_cultivo"("nombre");

-- CreateIndex
CREATE INDEX "ciclo_cultivo_huerto_id_idx" ON "ciclo_cultivo"("huerto_id");

-- CreateIndex
CREATE INDEX "ciclo_cultivo_cultivo_id_idx" ON "ciclo_cultivo"("cultivo_id");

-- CreateIndex
CREATE INDEX "ciclo_cultivo_etapa_cultivo_id_idx" ON "ciclo_cultivo"("etapa_cultivo_id");

-- CreateIndex
CREATE UNIQUE INDEX "unidad_medida_codigo_key" ON "unidad_medida"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "moneda_codigo_key" ON "moneda"("codigo");

-- CreateIndex
CREATE INDEX "registro_produccion_ciclo_cultivo_id_idx" ON "registro_produccion"("ciclo_cultivo_id");

-- CreateIndex
CREATE INDEX "registro_produccion_fecha_inicio_periodo_fecha_fin_periodo_idx" ON "registro_produccion"("fecha_inicio_periodo", "fecha_fin_periodo");

-- CreateIndex
CREATE INDEX "detalle_produccion_registro_produccion_id_idx" ON "detalle_produccion"("registro_produccion_id");

-- CreateIndex
CREATE INDEX "detalle_produccion_unidad_medida_id_idx" ON "detalle_produccion"("unidad_medida_id");

-- CreateIndex
CREATE UNIQUE INDEX "detalle_produccion_registro_produccion_id_unidad_medida_id_key" ON "detalle_produccion"("registro_produccion_id", "unidad_medida_id");

-- CreateIndex
CREATE INDEX "registro_venta_registro_produccion_id_idx" ON "registro_venta"("registro_produccion_id");

-- CreateIndex
CREATE INDEX "registro_venta_unidad_medida_id_idx" ON "registro_venta"("unidad_medida_id");

-- CreateIndex
CREATE INDEX "registro_venta_fecha_idx" ON "registro_venta"("fecha");

-- CreateIndex
CREATE INDEX "precio_venta_registro_venta_id_idx" ON "precio_venta"("registro_venta_id");

-- CreateIndex
CREATE INDEX "precio_venta_moneda_id_idx" ON "precio_venta"("moneda_id");

-- CreateIndex
CREATE UNIQUE INDEX "precio_venta_registro_venta_id_moneda_id_key" ON "precio_venta"("registro_venta_id", "moneda_id");

-- CreateIndex
CREATE UNIQUE INDEX "condicion_climatica_nombre_key" ON "condicion_climatica"("nombre");

-- CreateIndex
CREATE INDEX "visita_familia_id_idx" ON "visita"("familia_id");

-- CreateIndex
CREATE INDEX "visita_usuario_responsable_id_idx" ON "visita"("usuario_responsable_id");

-- CreateIndex
CREATE INDEX "visita_condicion_climatica_id_idx" ON "visita"("condicion_climatica_id");

-- CreateIndex
CREATE INDEX "visita_fecha_idx" ON "visita"("fecha");

-- CreateIndex
CREATE UNIQUE INDEX "calidad_nombre_key" ON "calidad"("nombre");

-- CreateIndex
CREATE INDEX "evaluacion_cultivo_visita_id_idx" ON "evaluacion_cultivo"("visita_id");

-- CreateIndex
CREATE INDEX "evaluacion_cultivo_ciclo_cultivo_id_idx" ON "evaluacion_cultivo"("ciclo_cultivo_id");

-- CreateIndex
CREATE INDEX "evaluacion_cultivo_etapa_cultivo_id_idx" ON "evaluacion_cultivo"("etapa_cultivo_id");

-- CreateIndex
CREATE INDEX "evaluacion_cultivo_calidad_id_idx" ON "evaluacion_cultivo"("calidad_id");

-- CreateIndex
CREATE UNIQUE INDEX "enfermedad_nombre_key" ON "enfermedad"("nombre");

-- CreateIndex
CREATE INDEX "evaluacion_enfermedad_evaluacion_cultivo_id_idx" ON "evaluacion_enfermedad"("evaluacion_cultivo_id");

-- CreateIndex
CREATE INDEX "evaluacion_enfermedad_enfermedad_id_idx" ON "evaluacion_enfermedad"("enfermedad_id");

-- CreateIndex
CREATE UNIQUE INDEX "evaluacion_enfermedad_evaluacion_cultivo_id_enfermedad_id_key" ON "evaluacion_enfermedad"("evaluacion_cultivo_id", "enfermedad_id");

-- CreateIndex
CREATE UNIQUE INDEX "plaga_nombre_key" ON "plaga"("nombre");

-- CreateIndex
CREATE INDEX "evaluacion_plaga_evaluacion_cultivo_id_idx" ON "evaluacion_plaga"("evaluacion_cultivo_id");

-- CreateIndex
CREATE INDEX "evaluacion_plaga_plaga_id_idx" ON "evaluacion_plaga"("plaga_id");

-- CreateIndex
CREATE UNIQUE INDEX "evaluacion_plaga_evaluacion_cultivo_id_plaga_id_key" ON "evaluacion_plaga"("evaluacion_cultivo_id", "plaga_id");

-- CreateIndex
CREATE UNIQUE INDEX "categoria_insumo_nombre_key" ON "categoria_insumo"("nombre");

-- CreateIndex
CREATE INDEX "insumo_categoria_insumo_id_idx" ON "insumo"("categoria_insumo_id");

-- CreateIndex
CREATE INDEX "insumo_unidad_medida_id_idx" ON "insumo"("unidad_medida_id");

-- CreateIndex
CREATE INDEX "tratamiento_aplicado_evaluacion_cultivo_id_idx" ON "tratamiento_aplicado"("evaluacion_cultivo_id");

-- CreateIndex
CREATE INDEX "tratamiento_aplicado_insumo_id_idx" ON "tratamiento_aplicado"("insumo_id");

-- CreateIndex
CREATE INDEX "tratamiento_aplicado_unidad_medida_id_idx" ON "tratamiento_aplicado"("unidad_medida_id");

-- CreateIndex
CREATE INDEX "entrega_insumo_familia_id_idx" ON "entrega_insumo"("familia_id");

-- CreateIndex
CREATE INDEX "entrega_insumo_usuario_responsable_id_idx" ON "entrega_insumo"("usuario_responsable_id");

-- CreateIndex
CREATE INDEX "entrega_insumo_fecha_idx" ON "entrega_insumo"("fecha");

-- CreateIndex
CREATE INDEX "detalle_entrega_insumo_entrega_insumo_id_idx" ON "detalle_entrega_insumo"("entrega_insumo_id");

-- CreateIndex
CREATE INDEX "detalle_entrega_insumo_insumo_id_idx" ON "detalle_entrega_insumo"("insumo_id");

-- CreateIndex
CREATE INDEX "detalle_entrega_insumo_unidad_medida_id_idx" ON "detalle_entrega_insumo"("unidad_medida_id");

-- CreateIndex
CREATE INDEX "seguimiento_tecnico_evaluacion_cultivo_id_idx" ON "seguimiento_tecnico"("evaluacion_cultivo_id");

-- CreateIndex
CREATE INDEX "seguimiento_tecnico_usuario_responsable_id_idx" ON "seguimiento_tecnico"("usuario_responsable_id");

-- CreateIndex
CREATE INDEX "seguimiento_tecnico_fecha_programada_idx" ON "seguimiento_tecnico"("fecha_programada");

-- CreateIndex
CREATE INDEX "capacitacion_comunidad_id_idx" ON "capacitacion"("comunidad_id");

-- CreateIndex
CREATE INDEX "capacitacion_fecha_idx" ON "capacitacion"("fecha");

-- CreateIndex
CREATE INDEX "participacion_capacitacion_capacitacion_id_idx" ON "participacion_capacitacion"("capacitacion_id");

-- CreateIndex
CREATE INDEX "participacion_capacitacion_integrante_familia_id_idx" ON "participacion_capacitacion"("integrante_familia_id");

-- CreateIndex
CREATE UNIQUE INDEX "participacion_capacitacion_capacitacion_id_integrante_famil_key" ON "participacion_capacitacion"("capacitacion_id", "integrante_familia_id");

-- CreateIndex
CREATE INDEX "visita_evidencia_evidencia_id_idx" ON "visita_evidencia"("evidencia_id");

-- CreateIndex
CREATE INDEX "evaluacion_evidencia_evidencia_id_idx" ON "evaluacion_evidencia"("evidencia_id");

-- CreateIndex
CREATE INDEX "capacitacion_evidencia_evidencia_id_idx" ON "capacitacion_evidencia"("evidencia_id");

-- CreateIndex
CREATE INDEX "alerta_familia_id_idx" ON "alerta"("familia_id");

-- CreateIndex
CREATE INDEX "alerta_visita_id_idx" ON "alerta"("visita_id");

-- CreateIndex
CREATE INDEX "alerta_seguimiento_tecnico_id_idx" ON "alerta"("seguimiento_tecnico_id");

-- CreateIndex
CREATE INDEX "alerta_estado_idx" ON "alerta"("estado");

-- CreateIndex
CREATE INDEX "alerta_fecha_vencimiento_idx" ON "alerta"("fecha_vencimiento");

-- CreateIndex
CREATE UNIQUE INDEX "usuario_correo_key" ON "usuario"("correo");

-- CreateIndex
CREATE UNIQUE INDEX "rol_nombre_key" ON "rol"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "permiso_codigo_key" ON "permiso"("codigo");

-- CreateIndex
CREATE INDEX "usuario_rol_rol_id_idx" ON "usuario_rol"("rol_id");

-- CreateIndex
CREATE INDEX "rol_permiso_permiso_id_idx" ON "rol_permiso"("permiso_id");

-- CreateIndex
CREATE INDEX "bitacora_usuario_id_idx" ON "bitacora"("usuario_id");

-- CreateIndex
CREATE INDEX "bitacora_fecha_idx" ON "bitacora"("fecha");

-- CreateIndex
CREATE INDEX "bitacora_entidad_registro_id_idx" ON "bitacora"("entidad", "registro_id");

-- AddForeignKey
ALTER TABLE "comunidad" ADD CONSTRAINT "comunidad_municipio_id_fkey" FOREIGN KEY ("municipio_id") REFERENCES "municipio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "familia" ADD CONSTRAINT "familia_comunidad_id_fkey" FOREIGN KEY ("comunidad_id") REFERENCES "comunidad"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integrante_familia" ADD CONSTRAINT "integrante_familia_familia_id_fkey" FOREIGN KEY ("familia_id") REFERENCES "familia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "familia_programa" ADD CONSTRAINT "familia_programa_familia_id_fkey" FOREIGN KEY ("familia_id") REFERENCES "familia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "familia_programa" ADD CONSTRAINT "familia_programa_programa_id_fkey" FOREIGN KEY ("programa_id") REFERENCES "programa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "huerto" ADD CONSTRAINT "huerto_familia_id_fkey" FOREIGN KEY ("familia_id") REFERENCES "familia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ciclo_cultivo" ADD CONSTRAINT "ciclo_cultivo_huerto_id_fkey" FOREIGN KEY ("huerto_id") REFERENCES "huerto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ciclo_cultivo" ADD CONSTRAINT "ciclo_cultivo_cultivo_id_fkey" FOREIGN KEY ("cultivo_id") REFERENCES "cultivo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ciclo_cultivo" ADD CONSTRAINT "ciclo_cultivo_etapa_cultivo_id_fkey" FOREIGN KEY ("etapa_cultivo_id") REFERENCES "etapa_cultivo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registro_produccion" ADD CONSTRAINT "registro_produccion_ciclo_cultivo_id_fkey" FOREIGN KEY ("ciclo_cultivo_id") REFERENCES "ciclo_cultivo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detalle_produccion" ADD CONSTRAINT "detalle_produccion_registro_produccion_id_fkey" FOREIGN KEY ("registro_produccion_id") REFERENCES "registro_produccion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detalle_produccion" ADD CONSTRAINT "detalle_produccion_unidad_medida_id_fkey" FOREIGN KEY ("unidad_medida_id") REFERENCES "unidad_medida"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registro_venta" ADD CONSTRAINT "registro_venta_registro_produccion_id_fkey" FOREIGN KEY ("registro_produccion_id") REFERENCES "registro_produccion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registro_venta" ADD CONSTRAINT "registro_venta_unidad_medida_id_fkey" FOREIGN KEY ("unidad_medida_id") REFERENCES "unidad_medida"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "precio_venta" ADD CONSTRAINT "precio_venta_registro_venta_id_fkey" FOREIGN KEY ("registro_venta_id") REFERENCES "registro_venta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "precio_venta" ADD CONSTRAINT "precio_venta_moneda_id_fkey" FOREIGN KEY ("moneda_id") REFERENCES "moneda"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visita" ADD CONSTRAINT "visita_familia_id_fkey" FOREIGN KEY ("familia_id") REFERENCES "familia"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visita" ADD CONSTRAINT "visita_usuario_responsable_id_fkey" FOREIGN KEY ("usuario_responsable_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visita" ADD CONSTRAINT "visita_condicion_climatica_id_fkey" FOREIGN KEY ("condicion_climatica_id") REFERENCES "condicion_climatica"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluacion_cultivo" ADD CONSTRAINT "evaluacion_cultivo_visita_id_fkey" FOREIGN KEY ("visita_id") REFERENCES "visita"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluacion_cultivo" ADD CONSTRAINT "evaluacion_cultivo_ciclo_cultivo_id_fkey" FOREIGN KEY ("ciclo_cultivo_id") REFERENCES "ciclo_cultivo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluacion_cultivo" ADD CONSTRAINT "evaluacion_cultivo_etapa_cultivo_id_fkey" FOREIGN KEY ("etapa_cultivo_id") REFERENCES "etapa_cultivo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluacion_cultivo" ADD CONSTRAINT "evaluacion_cultivo_calidad_id_fkey" FOREIGN KEY ("calidad_id") REFERENCES "calidad"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluacion_enfermedad" ADD CONSTRAINT "evaluacion_enfermedad_evaluacion_cultivo_id_fkey" FOREIGN KEY ("evaluacion_cultivo_id") REFERENCES "evaluacion_cultivo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluacion_enfermedad" ADD CONSTRAINT "evaluacion_enfermedad_enfermedad_id_fkey" FOREIGN KEY ("enfermedad_id") REFERENCES "enfermedad"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluacion_plaga" ADD CONSTRAINT "evaluacion_plaga_evaluacion_cultivo_id_fkey" FOREIGN KEY ("evaluacion_cultivo_id") REFERENCES "evaluacion_cultivo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluacion_plaga" ADD CONSTRAINT "evaluacion_plaga_plaga_id_fkey" FOREIGN KEY ("plaga_id") REFERENCES "plaga"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "insumo" ADD CONSTRAINT "insumo_categoria_insumo_id_fkey" FOREIGN KEY ("categoria_insumo_id") REFERENCES "categoria_insumo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "insumo" ADD CONSTRAINT "insumo_unidad_medida_id_fkey" FOREIGN KEY ("unidad_medida_id") REFERENCES "unidad_medida"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tratamiento_aplicado" ADD CONSTRAINT "tratamiento_aplicado_evaluacion_cultivo_id_fkey" FOREIGN KEY ("evaluacion_cultivo_id") REFERENCES "evaluacion_cultivo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tratamiento_aplicado" ADD CONSTRAINT "tratamiento_aplicado_insumo_id_fkey" FOREIGN KEY ("insumo_id") REFERENCES "insumo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tratamiento_aplicado" ADD CONSTRAINT "tratamiento_aplicado_unidad_medida_id_fkey" FOREIGN KEY ("unidad_medida_id") REFERENCES "unidad_medida"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entrega_insumo" ADD CONSTRAINT "entrega_insumo_familia_id_fkey" FOREIGN KEY ("familia_id") REFERENCES "familia"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entrega_insumo" ADD CONSTRAINT "entrega_insumo_usuario_responsable_id_fkey" FOREIGN KEY ("usuario_responsable_id") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detalle_entrega_insumo" ADD CONSTRAINT "detalle_entrega_insumo_entrega_insumo_id_fkey" FOREIGN KEY ("entrega_insumo_id") REFERENCES "entrega_insumo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detalle_entrega_insumo" ADD CONSTRAINT "detalle_entrega_insumo_insumo_id_fkey" FOREIGN KEY ("insumo_id") REFERENCES "insumo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detalle_entrega_insumo" ADD CONSTRAINT "detalle_entrega_insumo_unidad_medida_id_fkey" FOREIGN KEY ("unidad_medida_id") REFERENCES "unidad_medida"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seguimiento_tecnico" ADD CONSTRAINT "seguimiento_tecnico_evaluacion_cultivo_id_fkey" FOREIGN KEY ("evaluacion_cultivo_id") REFERENCES "evaluacion_cultivo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seguimiento_tecnico" ADD CONSTRAINT "seguimiento_tecnico_usuario_responsable_id_fkey" FOREIGN KEY ("usuario_responsable_id") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "capacitacion" ADD CONSTRAINT "capacitacion_comunidad_id_fkey" FOREIGN KEY ("comunidad_id") REFERENCES "comunidad"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participacion_capacitacion" ADD CONSTRAINT "participacion_capacitacion_capacitacion_id_fkey" FOREIGN KEY ("capacitacion_id") REFERENCES "capacitacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participacion_capacitacion" ADD CONSTRAINT "participacion_capacitacion_integrante_familia_id_fkey" FOREIGN KEY ("integrante_familia_id") REFERENCES "integrante_familia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visita_evidencia" ADD CONSTRAINT "visita_evidencia_visita_id_fkey" FOREIGN KEY ("visita_id") REFERENCES "visita"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visita_evidencia" ADD CONSTRAINT "visita_evidencia_evidencia_id_fkey" FOREIGN KEY ("evidencia_id") REFERENCES "evidencia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluacion_evidencia" ADD CONSTRAINT "evaluacion_evidencia_evaluacion_cultivo_id_fkey" FOREIGN KEY ("evaluacion_cultivo_id") REFERENCES "evaluacion_cultivo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluacion_evidencia" ADD CONSTRAINT "evaluacion_evidencia_evidencia_id_fkey" FOREIGN KEY ("evidencia_id") REFERENCES "evidencia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "capacitacion_evidencia" ADD CONSTRAINT "capacitacion_evidencia_capacitacion_id_fkey" FOREIGN KEY ("capacitacion_id") REFERENCES "capacitacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "capacitacion_evidencia" ADD CONSTRAINT "capacitacion_evidencia_evidencia_id_fkey" FOREIGN KEY ("evidencia_id") REFERENCES "evidencia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerta" ADD CONSTRAINT "alerta_familia_id_fkey" FOREIGN KEY ("familia_id") REFERENCES "familia"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerta" ADD CONSTRAINT "alerta_visita_id_fkey" FOREIGN KEY ("visita_id") REFERENCES "visita"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerta" ADD CONSTRAINT "alerta_seguimiento_tecnico_id_fkey" FOREIGN KEY ("seguimiento_tecnico_id") REFERENCES "seguimiento_tecnico"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuario_rol" ADD CONSTRAINT "usuario_rol_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuario_rol" ADD CONSTRAINT "usuario_rol_rol_id_fkey" FOREIGN KEY ("rol_id") REFERENCES "rol"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rol_permiso" ADD CONSTRAINT "rol_permiso_rol_id_fkey" FOREIGN KEY ("rol_id") REFERENCES "rol"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rol_permiso" ADD CONSTRAINT "rol_permiso_permiso_id_fkey" FOREIGN KEY ("permiso_id") REFERENCES "permiso"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bitacora" ADD CONSTRAINT "bitacora_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
