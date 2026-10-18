-- AUTH-04: Migración de DATOS de roles de prueba a cargos reales.
-- Se conserva la asignación de usuarios y permisos existentes.
-- No se altera el esquema; se despliega con Prisma Migrate.
-- Los usuarios sintéticos no se eliminan ni se cambian de estado.
BEGIN;

DO $$
DECLARE
  fila RECORD;
  anterior_id INTEGER;
  destino_id INTEGER;
BEGIN
  FOR fila IN
    SELECT * FROM (VALUES
      ('Rol Sintético Técnico', 'Técnico agropecuario', 'Personal de campo: cultivos, huertos y asistencia técnica.'),
      ('Rol Sintético Coordinador', 'Coordinadora del programa agroforestal', 'Coordinación de los proyectos agroforestales.'),
      ('Rol Sintético Auditor', 'Auditor', 'Consulta y seguimiento de auditoría.')
    ) AS v(nombre_anterior, nombre_nuevo, descripcion_nueva)
  LOOP
    SELECT id INTO anterior_id FROM rol WHERE nombre = fila.nombre_anterior;
    SELECT id INTO destino_id FROM rol WHERE nombre = fila.nombre_nuevo;

    IF anterior_id IS NOT NULL THEN
      IF destino_id IS NULL THEN
        -- Renombrar conserva el ID, usuario_rol y rol_permiso sin cambios.
        UPDATE rol
        SET nombre = fila.nombre_nuevo,
            descripcion = CASE
              WHEN descripcion IS NULL OR btrim(descripcion) = ''
                OR descripcion ILIKE '%sintétic%' OR descripcion ILIKE '%fictici%'
              THEN fila.descripcion_nueva ELSE descripcion END
        WHERE id = anterior_id;
      ELSE
        -- Si el rol real ya existe, fusionar relaciones antes de retirar
        -- únicamente la FILA DEL ROL sintético, sin borrar usuarios/permisos.
        INSERT INTO usuario_rol (usuario_id, rol_id)
        SELECT usuario_id, destino_id FROM usuario_rol WHERE rol_id = anterior_id
        ON CONFLICT (usuario_id, rol_id) DO NOTHING;

        INSERT INTO rol_permiso (rol_id, permiso_id)
        SELECT destino_id, permiso_id FROM rol_permiso WHERE rol_id = anterior_id
        ON CONFLICT (rol_id, permiso_id) DO NOTHING;

        DELETE FROM rol WHERE id = anterior_id;
      END IF;
    END IF;
  END LOOP;
END $$;

-- Crear cargos que faltan, manteniendo los existentes y su configuración.
INSERT INTO rol (nombre, descripcion, activo) VALUES
  ('Dirección general', 'Dirección y supervisión general de la organización.', TRUE),
  ('Coordinadora del programa agroforestal', 'Coordinación de proyectos agroforestales.', TRUE),
  ('Contadora interna', 'Gestión y control financiero y contable.', TRUE),
  ('Técnico agropecuario', 'Trabajo técnico de campo, huertos y capacitaciones.', TRUE),
  ('Auditor', 'Seguimiento y auditoría de la organización.', TRUE)
ON CONFLICT (nombre) DO NOTHING;

COMMIT;
