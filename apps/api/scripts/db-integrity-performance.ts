import "dotenv/config";
import { Client } from "pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required.");
}

const client = new Client({ connectionString });
const results: Array<{ name: string; expected: string; obtained: string; passed: boolean }> = [];

async function scalar<T>(text: string, values: unknown[] = []): Promise<T> {
  const result = await client.query<Record<string, T>>(text, values);
  return Object.values(result.rows[0])[0];
}

async function expectDatabaseError(name: string, expected: string, action: () => Promise<void>) {
  try {
    await action();
    results.push({ name, expected, obtained: "La operación fue aceptada", passed: false });
  } catch (error) {
    results.push({ name, expected, obtained: String(error).replace(/\s+/g, " "), passed: true });
  }
}

async function runConstraintTests() {
  await client.query("BEGIN");
  await expectDatabaseError(
    "FK inválida",
    "INSERT rechaza comunidad con municipio_id inexistente",
    async () => {
      await client.query("INSERT INTO comunidad (municipio_id, nombre, activo) VALUES ($1, $2, true)", [999999999, "FK inválida"]);
    },
  );
  await client.query("ROLLBACK");

  await client.query("BEGIN");
  await expectDatabaseError(
    "NOT NULL",
    "INSERT rechaza municipio sin nombre",
    async () => {
      await client.query("INSERT INTO municipio (nombre, activo) VALUES (NULL, true)");
    },
  );
  await client.query("ROLLBACK");

  await client.query("BEGIN");
  const uniqueName = `Integrity unique ${Date.now()}`;
  await client.query("INSERT INTO municipio (nombre, activo) VALUES ($1, true)", [uniqueName]);
  await expectDatabaseError(
    "UNIQUE",
    "Segundo municipio con el mismo nombre es rechazado",
    async () => {
      await client.query("INSERT INTO municipio (nombre, activo) VALUES ($1, true)", [uniqueName]);
    },
  );
  await client.query("ROLLBACK");
}

async function runReferentialTests() {
  await client.query("BEGIN");
  const municipio = await scalar<number>("INSERT INTO municipio (nombre, activo) VALUES ($1, true) RETURNING id", [`Cascade municipality ${Date.now()}`]);
  const comunidad = await scalar<number>("INSERT INTO comunidad (municipio_id, nombre, activo) VALUES ($1, $2, true) RETURNING id", [municipio, "Cascade community"]);
  const familia = await scalar<number>("INSERT INTO familia (comunidad_id, nombre_referencia, estado) VALUES ($1, $2, 'ACTIVA') RETURNING id", [comunidad, "Cascade family"]);
  await client.query("INSERT INTO integrante_familia (familia_id, nombre_completo, activo) VALUES ($1, 'Cascade member', true)", [familia]);
  await client.query("INSERT INTO huerto (familia_id, nombre, estado) VALUES ($1, 'Cascade garden', 'ACTIVO')", [familia]);
  await client.query("DELETE FROM familia WHERE id = $1", [familia]);
  const members = await scalar<number>("SELECT count(*)::int AS value FROM integrante_familia WHERE familia_id = $1", [familia]);
  results.push({ name: "ON DELETE CASCADE", expected: "Eliminar familia elimina sus integrantes", obtained: `${members} integrantes restantes`, passed: members === 0 });
  const gardens = await scalar<number>("SELECT count(*)::int AS value FROM huerto WHERE familia_id = $1", [familia]);
  results.push({ name: "Discrepancia schema/migración familia -> huerto", expected: "La base aplicada sigue la migración y elimina el huerto en CASCADE", obtained: `${gardens} huertos restantes`, passed: gardens === 0 });
  await client.query("ROLLBACK");

  await client.query("BEGIN");
  const restrictedMunicipio = await scalar<number>("INSERT INTO municipio (nombre, activo) VALUES ($1, true) RETURNING id", [`Restrict municipality ${Date.now()}`]);
  await client.query("INSERT INTO comunidad (municipio_id, nombre, activo) VALUES ($1, 'Restrict community', true)", [restrictedMunicipio]);
  try {
    await client.query("DELETE FROM municipio WHERE id = $1", [restrictedMunicipio]);
    results.push({ name: "ON DELETE RESTRICT", expected: "No permite eliminar municipio con comunidades", obtained: "El municipio fue eliminado", passed: false });
  } catch (error) {
    results.push({ name: "ON DELETE RESTRICT", expected: "No permite eliminar municipio con comunidades", obtained: String(error).replace(/\s+/g, " "), passed: true });
  }
  await client.query("ROLLBACK");

  await client.query("BEGIN");
  const climate = await scalar<number>("INSERT INTO condicion_climatica (nombre, activo) VALUES ($1, true) RETURNING id", [`Set null climate ${Date.now()}`]);
  const municipioForVisit = await scalar<number>("INSERT INTO municipio (nombre, activo) VALUES ($1, true) RETURNING id", [`Set null municipality ${Date.now()}`]);
  const communityForVisit = await scalar<number>("INSERT INTO comunidad (municipio_id, nombre, activo) VALUES ($1, 'Set null community', true) RETURNING id", [municipioForVisit]);
  const familyForVisit = await scalar<number>("INSERT INTO familia (comunidad_id, nombre_referencia, estado) VALUES ($1, 'Set null family', 'ACTIVA') RETURNING id", [communityForVisit]);
  const user = await scalar<number>("INSERT INTO usuario (nombre, correo, password_hash, estado, fecha_creacion) VALUES ('Set null user', $1, 'test', 'ACTIVO', now()) RETURNING id", [`set-null-${Date.now()}@invalid.test`]);
  const visit = await scalar<number>("INSERT INTO visita (familia_id, usuario_responsable_id, condicion_climatica_id, fecha, estado) VALUES ($1, $2, $3, current_date, 'PROGRAMADA') RETURNING id", [familyForVisit, user, climate]);
  await client.query("DELETE FROM condicion_climatica WHERE id = $1", [climate]);
  const climateAfterDelete = await scalar<number | null>("SELECT condicion_climatica_id AS value FROM visita WHERE id = $1", [visit]);
  results.push({ name: "ON DELETE SET NULL", expected: "Eliminar condición deja visita con FK NULL", obtained: `condicion_climatica_id=${climateAfterDelete}`, passed: climateAfterDelete === null });
  await client.query("ROLLBACK");
}

async function runReferentialAudit() {
  const foreignKeys = await client.query<{ constraint_name: string; child_table: string; parent_table: string; child_columns: string[]; parent_columns: string[] }>(`SELECT c.conname AS constraint_name, child.relname AS child_table, parent.relname AS parent_table,
      ARRAY(SELECT a.attname FROM unnest(c.conkey) WITH ORDINALITY AS key(attnum, position) JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = key.attnum ORDER BY key.position) AS child_columns,
      ARRAY(SELECT a.attname FROM unnest(c.confkey) WITH ORDINALITY AS key(attnum, position) JOIN pg_attribute a ON a.attrelid = c.confrelid AND a.attnum = key.attnum ORDER BY key.position) AS parent_columns
    FROM pg_constraint c JOIN pg_class child ON child.oid = c.conrelid JOIN pg_class parent ON parent.oid = c.confrelid
    WHERE c.contype = 'f' AND child.relnamespace = 'public'::regnamespace`);
  const quote = (identifier: string) => `"${identifier.replace(/"/g, '""')}"`;
  const columns = (value: string[] | string) => Array.isArray(value) ? value : value.slice(1, -1).split(",").map((column) => column.replace(/^"|"$/g, ""));
  let invalid = 0;
  for (const foreignKey of foreignKeys.rows) {
    const childColumns = columns(foreignKey.child_columns);
    const parentColumns = columns(foreignKey.parent_columns);
    const comparisons = childColumns.map((column, index) => `child.${quote(column)} = parent.${quote(parentColumns[index])}`).join(" AND ");
    const nonNull = childColumns.map((column) => `child.${quote(column)} IS NOT NULL`).join(" AND ");
    invalid += await scalar<number>(`SELECT count(*)::int AS value FROM ${quote(foreignKey.child_table)} child WHERE ${nonNull} AND NOT EXISTS (SELECT 1 FROM ${quote(foreignKey.parent_table)} parent WHERE ${comparisons})`);
  }
  results.push({ name: "Auditoría de integridad referencial completa", expected: "Cero referencias inválidas en todas las FK", obtained: `${invalid} referencias inválidas en ${foreignKeys.rows.length} FK`, passed: invalid === 0 });
}

async function runCheckAudit() {
  const checks = await client.query<{ table_name: string; constraint_name: string; definition: string }>(`SELECT r.relname AS table_name, c.conname AS constraint_name, pg_get_constraintdef(c.oid) AS definition
    FROM pg_constraint c JOIN pg_class r ON r.oid = c.conrelid JOIN pg_namespace n ON n.oid = r.relnamespace
    WHERE c.contype = 'c' AND n.nspname = 'public' ORDER BY table_name, constraint_name`);
  results.push({ name: "CHECK declarados", expected: "Reportar los CHECK realmente aplicados", obtained: checks.rows.length ? checks.rows.map((row) => `${row.table_name}.${row.constraint_name}: ${row.definition}`).join(" | ") : "No existen CHECK en public", passed: true });
}

async function runPerformanceQueries() {
  const queries: Array<[string, string]> = [
    ["Familias/comunidades", "SELECT c.nombre AS comunidad, count(f.id)::int AS familias FROM comunidad c LEFT JOIN familia f ON f.comunidad_id = c.id GROUP BY c.id, c.nombre ORDER BY c.nombre"],
    ["Huertos/cultivos", "SELECT h.id, h.nombre, count(cc.id)::int AS ciclos FROM huerto h LEFT JOIN ciclo_cultivo cc ON cc.huerto_id = h.id GROUP BY h.id, h.nombre ORDER BY h.id"],
    ["Producción/ventas", "SELECT rp.id, sum(dp.cantidad_total) AS produccion, coalesce(sum(rv.cantidad_vendida), 0) AS ventas FROM registro_produccion rp LEFT JOIN detalle_produccion dp ON dp.registro_produccion_id = rp.id LEFT JOIN registro_venta rv ON rv.registro_produccion_id = rp.id GROUP BY rp.id ORDER BY rp.id"],
    ["Visitas/evaluaciones/seguimiento", "SELECT v.id, count(DISTINCT e.id)::int AS evaluaciones, count(DISTINCT s.id)::int AS seguimientos FROM visita v LEFT JOIN evaluacion_cultivo e ON e.visita_id = v.id LEFT JOIN seguimiento_tecnico s ON s.evaluacion_cultivo_id = e.id GROUP BY v.id ORDER BY v.id"],
    ["Capacitaciones", "SELECT c.id, count(pc.id)::int AS participantes FROM capacitacion c LEFT JOIN participacion_capacitacion pc ON pc.capacitacion_id = c.id GROUP BY c.id ORDER BY c.id"],
    ["Insumos", "SELECT i.id, i.nombre, count(dei.id)::int AS entregas FROM insumo i LEFT JOIN detalle_entrega_insumo dei ON dei.insumo_id = i.id GROUP BY i.id, i.nombre ORDER BY i.id"],
    ["Seguridad/roles/permisos", "SELECT u.id, count(DISTINCT ur.rol_id)::int AS roles, count(DISTINCT rp.permiso_id)::int AS permisos FROM usuario u LEFT JOIN usuario_rol ur ON ur.usuario_id = u.id LEFT JOIN rol_permiso rp ON rp.rol_id = ur.rol_id GROUP BY u.id ORDER BY u.id"],
  ];
  for (const [name, sql] of queries) {
    const explain = await client.query(`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${sql}`);
    const plan = explain.rows[0]["QUERY PLAN"][0];
    console.log(JSON.stringify({ performance: name, executionTimeMs: plan["Execution Time"], planningTimeMs: plan["Planning Time"], plan: plan.Plan }));
  }
}

async function main() {
  await client.connect();
  await runConstraintTests();
  await runReferentialTests();
  await runReferentialAudit();
  await runCheckAudit();
  console.log(JSON.stringify({ results }, null, 2));
  await runPerformanceQueries();
  if (results.some((result) => !result.passed)) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(() => client.end());
