-- No se eliminan registros con vínculos históricos; se inactivan solo catálogos de prueba identificados.
UPDATE comunidad SET activo = FALSE WHERE municipio_id IN (
  SELECT id FROM municipio WHERE nombre IN ('Municipio Sintético Norte', 'Municipio Sintético Sur')
) OR nombre IN ('Comunidad Loma de Prueba', 'Comunidad Valle de Prueba', 'Comunidad Bosque de Prueba');
UPDATE municipio SET activo = FALSE WHERE nombre IN ('Municipio Sintético Norte', 'Municipio Sintético Sur');

-- Conservar las referencias de familia_programa: si no existe la opción institucional, renombrar la de prueba.
UPDATE programa p SET nombre = 'Huertos', descripcion = NULL
WHERE nombre = 'Programa Sintético Huertos' AND NOT EXISTS (
  SELECT 1 FROM programa r WHERE lower(r.nombre) = lower('Huertos')
);
UPDATE programa p SET nombre = 'Capacitación', descripcion = NULL
WHERE nombre = 'Programa Sintético Capacitación' AND NOT EXISTS (
  SELECT 1 FROM programa r WHERE lower(r.nombre) = lower('Capacitación')
);
INSERT INTO programa (nombre, estado) SELECT 'Huertos', 'ACTIVO'
WHERE NOT EXISTS (SELECT 1 FROM programa WHERE lower(nombre) = lower('Huertos'));
INSERT INTO programa (nombre, estado) SELECT 'Capacitación', 'ACTIVO'
WHERE NOT EXISTS (SELECT 1 FROM programa WHERE lower(nombre) = lower('Capacitación'));
UPDATE programa SET estado = 'INACTIVO'
WHERE nombre IN ('Programa Sintético Huertos', 'Programa Sintético Capacitación');
