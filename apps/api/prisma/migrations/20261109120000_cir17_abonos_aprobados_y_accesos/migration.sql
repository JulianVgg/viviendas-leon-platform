-- CIR-17: catálogo oficial de soporte técnico, permisos de administración y clasificación de abonos.
-- Reutiliza insumo/categoria_insumo; no altera registros de aplicación ni inventarios existentes.

-- Dirección y Coordinación también administran los catálogos, junto al Técnico.
INSERT INTO rol_permiso (rol_id, permiso_id)
SELECT r.id, p.id
FROM rol r
JOIN permiso p ON p.codigo IN ('PANTALLA_INSUMOS', 'INSUMOS_WRITE')
WHERE r.nombre IN ('Dirección general', 'Coordinadora del programa agroforestal',
                   'Coordinador del programa agroforestal', 'Coordinación')
ON CONFLICT (rol_id, permiso_id) DO NOTHING;

INSERT INTO categoria_insumo (nombre, descripcion, activo) VALUES
('Abonos orgánicos', 'Abonos y preparados de origen orgánico.', true),
('Abonos inorgánicos', 'Fertilizantes minerales o formulados.', true),
('Insecticidas orgánicos', 'Tratamientos para control de plagas.', true),
('Fungicidas orgánicos', 'Preparados para control de hongos.', true),
('Insecticidas químicos', 'Productos químicos para control de insectos.', true)
ON CONFLICT (nombre) DO NOTHING;

-- Los cuatro bioinsumos fueron confirmados por la organización. No se borran sus IDs
-- ni se pierden tratamientos o entregas vinculados a ellos.
UPDATE insumo
SET activo = true, descripcion = NULL
WHERE nombre IN ('Microorganismos de montaña', 'Super magro', 'Lombricompost', 'Lixiviados')
  AND descripcion = 'Propuesta CIR-17. Pendiente de confirmar con el técnico agrónomo.';

-- Opciones de la ficha institucional y formulario «Huertos - Evaluacion Agricola Semenal».
-- Urea, Triple 15 y Triple 20 se clasifican como abonos inorgánicos, no insecticidas.
WITH catalogo(categoria, nombre) AS (VALUES
  ('Abonos orgánicos', 'Bocashi'),
  ('Abonos orgánicos', 'Foliar a base de Chichicaste, apasote y albahaca'),
  ('Abonos orgánicos', 'Foliar a base de encino'),
  ('Abonos orgánicos', 'Foliar a base de sauco, aliso y hierba mora'),
  ('Abonos orgánicos', 'Té de estiércol o compost'),
  ('Abonos inorgánicos', 'Urea'),
  ('Abonos inorgánicos', 'Triple 15'),
  ('Abonos inorgánicos', 'Triple 20'),
  ('Insecticidas orgánicos', 'Ajo'),
  ('Insecticidas orgánicos', 'Cal'),
  ('Insecticidas orgánicos', 'Cebolla, Ajo y Vinagre'),
  ('Insecticidas orgánicos', 'Chile porrón o 7 caldos'),
  ('Insecticidas orgánicos', 'Clavo de olor'),
  ('Insecticidas orgánicos', 'Corteza de sauce'),
  ('Insecticidas orgánicos', 'Crisantemos, margaritas o gerberas'),
  ('Insecticidas orgánicos', 'Eucalipto'),
  ('Insecticidas orgánicos', 'Flor de muerto y ruda'),
  ('Insecticidas orgánicos', 'Jabón'),
  ('Insecticidas orgánicos', 'Manzanilla'),
  ('Insecticidas orgánicos', 'Nim'),
  ('Insecticidas orgánicos', 'Té de tabaco'),
  ('Fungicidas orgánicos', 'Cola de caballo'),
  ('Fungicidas orgánicos', 'Caldo sulfocalcico'),
  ('Fungicidas orgánicos', 'Caldo bordelés'),
  ('Fungicidas orgánicos', 'Caldo de ceniza'),
  ('Insecticidas químicos', 'Sipermetrina'),
  ('Insecticidas químicos', 'Iodam')
)
INSERT INTO insumo (categoria_insumo_id, nombre, descripcion, activo)
SELECT c.id, catalogo.nombre, NULL, true
FROM catalogo JOIN categoria_insumo c ON c.nombre = catalogo.categoria
WHERE NOT EXISTS (
  SELECT 1 FROM insumo i WHERE lower(trim(i.nombre)) = lower(trim(catalogo.nombre))
)
ON CONFLICT (categoria_insumo_id, nombre) DO NOTHING;

-- Los registros de demostración se conservan para auditoría, pero no deben
-- aparecer como opciones activas de tratamiento durante una visita institucional.
UPDATE insumo
SET activo = false
WHERE nombre LIKE 'Insumo Sintético %'
  AND descripcion = 'Insumo ficticio.';
