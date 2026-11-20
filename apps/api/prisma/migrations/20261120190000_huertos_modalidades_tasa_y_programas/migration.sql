-- Modalidades nuevas sin borrar las históricas.
ALTER TABLE huerto DROP CONSTRAINT IF EXISTS huerto_modalidades_productivas_chk;
ALTER TABLE huerto ADD CONSTRAINT huerto_modalidades_productivas_chk CHECK (
  modalidades_productivas <@ ARRAY['AGRICOLA','PECUARIO','AGROPECUARIO','AGROINDUSTRIA','AGROFORESTAL','SILVOPASTORIL']::TEXT[]
);

-- Tasa de referencia editable para EQUIVALENCIAS de reportes, independiente de tasas históricas.
CREATE TABLE configuracion_tipo_cambio (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  quetzales_por_dolar NUMERIC(18,6) NOT NULL CHECK (quetzales_por_dolar BETWEEN 0.01 AND 100),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  usuario_id INTEGER REFERENCES usuario(id) ON DELETE SET NULL
);
INSERT INTO configuracion_tipo_cambio (id, quetzales_por_dolar) VALUES (1, 7.600000);

INSERT INTO permiso (codigo, nombre, descripcion) VALUES
  ('PANTALLA_TIPO_CAMBIO', 'Tipo de cambio institucional', 'Consulta de la tasa de conversión de reportes.')
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO rol_permiso (rol_id, permiso_id)
SELECT DISTINCT rp.rol_id, p.id FROM rol_permiso rp
JOIN permiso existente ON existente.id = rp.permiso_id AND existente.codigo = 'TIPO_CAMBIO_WRITE'
CROSS JOIN permiso p
WHERE p.codigo = 'PANTALLA_TIPO_CAMBIO'
ON CONFLICT (rol_id, permiso_id) DO NOTHING;

-- Backfill: toda familia con huerto queda vinculada a Programa Huertos (sin duplicados).
INSERT INTO familia_programa (familia_id, programa_id, fecha_ingreso, estado, fecha_salida)
SELECT h.familia_id, p.id, MIN(h.fecha_inicio), 'ACTIVO', NULL
FROM huerto h CROSS JOIN programa p WHERE lower(btrim(p.nombre)) = 'huertos'
GROUP BY h.familia_id, p.id
ON CONFLICT (familia_id, programa_id) DO NOTHING;

-- Un huerto operativo no puede quedar ligado a una participación finalizada.
UPDATE familia_programa fp SET estado = 'ACTIVO', fecha_salida = NULL
FROM programa p WHERE fp.programa_id = p.id AND lower(btrim(p.nombre)) = 'huertos'
AND EXISTS (SELECT 1 FROM huerto h WHERE h.familia_id = fp.familia_id AND h.estado IN ('ACTIVO','PLANIFICADO'))
AND (fp.estado IS DISTINCT FROM 'ACTIVO' OR fp.fecha_salida IS NOT NULL);

CREATE FUNCTION proteger_programa_huertos() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM programa p WHERE p.id = OLD.programa_id AND lower(btrim(p.nombre)) = 'huertos')
    AND EXISTS (SELECT 1 FROM huerto h WHERE h.familia_id = OLD.familia_id AND h.estado IN ('ACTIVO','PLANIFICADO')) THEN
    IF TG_OP = 'DELETE' THEN
      RAISE EXCEPTION 'La familia tiene huertos activos; conserva su participación en Huertos.' USING ERRCODE='23514';
    END IF;
    IF NEW.programa_id IS DISTINCT FROM OLD.programa_id OR NEW.familia_id IS DISTINCT FROM OLD.familia_id
      OR NEW.estado IS DISTINCT FROM 'ACTIVO' OR NEW.fecha_salida IS NOT NULL THEN
      RAISE EXCEPTION 'La familia tiene huertos activos; conserva su participación en Huertos.' USING ERRCODE='23514';
    END IF;
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END; $$;
CREATE TRIGGER proteger_participacion_huertos BEFORE UPDATE OR DELETE ON familia_programa
FOR EACH ROW EXECUTE FUNCTION proteger_programa_huertos();
