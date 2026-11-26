-- FIN-02: Contador es el cargo operativo; Auditor sigue siendo lectura para auditorías futuras.
-- No modifica las credenciales ni crea una segunda cuenta para la persona existente.
BEGIN;

DO $$
DECLARE
  contador_id INTEGER;
  anterior_id INTEGER;
BEGIN
  SELECT id INTO contador_id FROM rol WHERE nombre = 'Contador';
  SELECT id INTO anterior_id FROM rol WHERE nombre = 'Contadora interna';

  IF contador_id IS NULL AND anterior_id IS NOT NULL THEN
    -- Renombrar en el mismo ID conserva las relaciones y permisos existentes.
    UPDATE rol SET nombre = 'Contador', descripcion = 'Registro y control financiero institucional.', activo = TRUE
    WHERE id = anterior_id;
    contador_id := anterior_id;
  ELSIF contador_id IS NULL THEN
    INSERT INTO rol (nombre, descripcion, activo)
    VALUES ('Contador', 'Registro y control financiero institucional.', TRUE)
    RETURNING id INTO contador_id;
  ELSE
    UPDATE rol SET descripcion = 'Registro y control financiero institucional.', activo = TRUE
    WHERE id = contador_id;
  END IF;

  -- Si ambos nombres existían, conservar las asignaciones sin duplicarlas.
  IF anterior_id IS NOT NULL AND anterior_id <> contador_id THEN
    INSERT INTO rol_permiso (rol_id, permiso_id)
    SELECT contador_id, permiso_id FROM rol_permiso WHERE rol_id = anterior_id
    ON CONFLICT (rol_id, permiso_id) DO NOTHING;

    INSERT INTO usuario_rol (usuario_id, rol_id)
    SELECT usuario_id, contador_id FROM usuario_rol WHERE rol_id = anterior_id
    ON CONFLICT (usuario_id, rol_id) DO NOTHING;

    DELETE FROM usuario_rol WHERE rol_id = anterior_id;
    UPDATE rol SET activo = FALSE WHERE id = anterior_id;
  END IF;

  -- Permisos explícitos del cargo: pantallas financieras, altas y anulaciones.
  -- No se transfieren permisos administrativos ni la bitácora técnica.
  INSERT INTO rol_permiso (rol_id, permiso_id)
  SELECT contador_id, id FROM permiso
  WHERE codigo IN (
    'PANTALLA_CONTROL_FINANCIERO', 'PANTALLA_FINANZAS_BANCOS',
    'PANTALLA_FINANZAS_CAJA', 'PANTALLA_FINANZAS_MEDICOS',
    'PANTALLA_FINANZAS_INFORME', 'FINANZAS_WRITE', 'FINANZAS_ANULAR',
    'PANTALLA_DASHBOARD', 'PANTALLA_MI_PERFIL', 'PANTALLA_NOTIFICACIONES'
  ) ON CONFLICT (rol_id, permiso_id) DO NOTHING;

  -- El cargo financiero no hereda acceso a la bitácora técnica.
  DELETE FROM rol_permiso rp
  USING permiso p
  WHERE rp.rol_id = contador_id AND rp.permiso_id = p.id
    AND p.codigo IN ('PANTALLA_AUDITORIA', 'PANTALLA_BITACORA');
END $$;

-- Corregir SOLO la cuenta ya existente de Brenda, si actualmente tiene Auditor.
-- No se convierte el rol Auditor en un rol de escritura ni se cambian otros usuarios.
DO $$
DECLARE
  coincidencias INTEGER;
  brenda_id INTEGER;
  auditor_id INTEGER;
  contador_id INTEGER;
BEGIN
  SELECT id INTO auditor_id FROM rol WHERE nombre = 'Auditor';
  SELECT id INTO contador_id FROM rol WHERE nombre = 'Contador';

  SELECT COUNT(*), MIN(u.id) INTO coincidencias, brenda_id
  FROM usuario u
  JOIN usuario_rol ur ON ur.usuario_id = u.id AND ur.rol_id = auditor_id
  WHERE (u.nombre ILIKE '%Brenda%' OR COALESCE(u.apellido, '') ILIKE '%Brenda%'
    OR COALESCE(u.apellido, '') ILIKE '%Sahon%');

  IF coincidencias > 1 THEN
    RAISE EXCEPTION 'Hay varias cuentas candidatas para Contador; revisar usuario_rol manualmente antes de migrar.';
  ELSIF coincidencias = 1 THEN
    INSERT INTO usuario_rol (usuario_id, rol_id)
    VALUES (brenda_id, contador_id)
    ON CONFLICT (usuario_id, rol_id) DO NOTHING;
    DELETE FROM usuario_rol WHERE usuario_id = brenda_id AND rol_id = auditor_id;
  ELSE
    RAISE NOTICE 'No se encontró una cuenta Brenda con rol Auditor; no se modifica ningún usuario.';
  END IF;
END $$;

COMMIT;
