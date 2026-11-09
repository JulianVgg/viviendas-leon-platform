-- El catálogo técnico lo administra el rol Técnico agropecuario, no Dirección.
INSERT INTO rol_permiso (rol_id, permiso_id)
SELECT r.id, p.id FROM rol r JOIN permiso p
  ON p.codigo IN ('PANTALLA_INSUMOS', 'INSUMOS_WRITE')
WHERE r.nombre = 'Técnico agropecuario'
ON CONFLICT (rol_id, permiso_id) DO NOTHING;

DELETE FROM rol_permiso rp USING rol r, permiso p
WHERE rp.rol_id = r.id AND rp.permiso_id = p.id
  AND p.codigo = 'INSUMOS_WRITE'
  AND r.nombre IN ('Dirección general', 'Coordinadora del programa agroforestal');

-- Categorías disponibles para que el técnico clasifique abonos de ambas clases.
INSERT INTO categoria_insumo (nombre, descripcion, activo) VALUES
('Abonos inorgánicos', 'Fertilizantes minerales o de síntesis.', true),
('Insecticidas', 'Productos empleados para el control de plagas.', true),
('Fungicidas', 'Productos empleados para el control de enfermedades fúngicas.', true)
ON CONFLICT (nombre) DO NOTHING;

-- Recuperar las listas que ya ofrecía el formulario anterior: no duplicar por nombre.
INSERT INTO plaga (nombre, descripcion, activo) VALUES
('Ácaro', NULL, true), ('Araña roja', NULL, true), ('Aves', NULL, true),
('Caracoles y babosas', NULL, true), ('Chinche', NULL, true),
('Cogollero', NULL, true), ('Gallina ciega', NULL, true),
('Hormigas', NULL, true), ('Larvas o gusanos', NULL, true),
('Minador de hoja', NULL, true), ('Mosca blanca', NULL, true),
('Mosca gusano', NULL, true), ('Pulgón', NULL, true), ('Trips', NULL, true)
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO enfermedad (nombre, descripcion, activo) VALUES
('Alternaria', NULL, true), ('Antracnosis', NULL, true),
('Botritis', NULL, true), ('Cercospora', NULL, true),
('Mal de talluelo', NULL, true), ('Mildiu', NULL, true),
('Damping-off', NULL, true), ('Hernia de las crucíferas', NULL, true),
('Mancha de anillo u ojo de sapo', NULL, true), ('Necrosis', NULL, true),
('Oídio', NULL, true), ('Phytophthora capsici (marchitez)', NULL, true),
('Royas y carbones', NULL, true), ('Sigatoka', NULL, true),
('Tizón tardío', NULL, true), ('Tizón temprano', NULL, true), ('Virosis', NULL, true)
ON CONFLICT (nombre) DO NOTHING;
