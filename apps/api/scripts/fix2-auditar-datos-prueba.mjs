// Solo lectura. Nunca borra personas, visitas, huertos ni evidencias de producción.
// Ejecutar DESPUÉS de configurar DATABASE_URL y antes de cualquier limpieza manual.
import 'dotenv/config'
import pg from 'pg'

if (!process.env.DATABASE_URL) throw new Error('Configura DATABASE_URL para auditar la base.')
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 1 })
try {
  const { rows } = await pool.query(`
    SELECT c.id AS comunidad_id, c.nombre AS comunidad, m.nombre AS municipio,
           f.id AS familia_id, f.nombre_referencia AS familia,
           (SELECT count(*) FROM visita v WHERE v.familia_id = f.id)::int AS visitas,
           (SELECT count(*) FROM huerto h WHERE h.familia_id = f.id)::int AS huertos,
           (SELECT count(*) FROM integrante_familia i WHERE i.familia_id = f.id)::int AS integrantes,
           (SELECT count(*) FROM familia_programa fp WHERE fp.familia_id = f.id)::int AS programas,
           (SELECT count(*) FROM asistencia_familia_capacitacion a WHERE a.familia_id = f.id)::int AS asistencias
      FROM comunidad c
      JOIN municipio m ON m.id = c.municipio_id
      LEFT JOIN familia f ON f.comunidad_id = c.id
     WHERE m.nombre IN ('Municipio Sintético Norte', 'Municipio Sintético Sur')
        OR c.nombre IN ('Comunidad Loma de Prueba', 'Comunidad Valle de Prueba', 'Comunidad Bosque de Prueba')
     ORDER BY c.id, f.id
  `)
  console.log('AUDITORÍA DE REFERENCIAS DE PRUEBA — SOLO LECTURA')
  console.table(rows)
  console.log('No se ha eliminado ningún registro. Realiza respaldo y comprueba cada vínculo antes de depurar.')
} finally { await pool.end() }
