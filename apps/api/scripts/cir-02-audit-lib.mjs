// CIR-02: conciliación de solo lectura; no transforma ni modifica registros.
// Este módulo no contiene datos personales del padrón institucional.
export function normalizeText(value) {
  return String(value ?? '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim().replace(/\s+/g, ' ')
}

export function parseCsv(input) {
  const text = String(input).replace(/^\uFEFF/, '')
  const rows = []
  let row = [], field = '', inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i++ }
      else if (ch === '"') inQuotes = false
      else field += ch
    } else if (ch === '"') {
      if (field.trim()) throw new Error('CSV inválido: comillas en un campo sin escapar.')
      inQuotes = true
    } else if (ch === ',') {
      row.push(field); field = ''
    } else if (ch === '\n') {
      row.push(field.replace(/\r$/, '')); field = ''
      if (row.some((value) => value.trim())) rows.push(row)
      row = []
    } else {
      field += ch
    }
  }
  if (inQuotes) throw new Error('CSV inválido: comillas sin cerrar.')
  row.push(field.replace(/\r$/, ''))
  if (row.some((value) => value.trim())) rows.push(row)
  if (!rows.length) throw new Error('El CSV está vacío.')
  const header = rows.shift().map((value) => normalizeText(value))
  if (header.length !== 2 || header[0] !== 'nombre' || header[1] !== 'comunidad') {
    throw new Error('El CSV debe tener exactamente las columnas nombre,comunidad.')
  }
  const data = rows.map((values, index) => {
    if (values.length !== 2 || !values[0].trim() || !values[1].trim()) {
      throw new Error(`Fila ${index + 2}: nombre y comunidad son obligatorios.`)
    }
    return { nombre: values[0].trim(), comunidad: values[1].trim() }
  })
  if (data.length !== 19) throw new Error(`Se esperaban 19 participantes oficiales; se encontraron ${data.length}.`)
  const keys = data.map((item) => `${normalizeText(item.nombre)}|${normalizeText(item.comunidad)}`)
  if (new Set(keys).size !== keys.length) throw new Error('El padrón oficial contiene filas duplicadas.')
  return data
}

const labelFamily = (f) => `#${f.id}: ${f.nombreReferencia}`
const tokens = (value) => new Set(normalizeText(value).split(' ').filter((word) => word.length > 1))

// Una coincidencia parcial es solo una sugerencia; nunca es aprobación ni ajuste de datos.
function partialCandidate(officialName, dbName) {
  const a = tokens(officialName), b = tokens(dbName)
  const common = [...a].filter((word) => b.has(word)).length
  return common >= 2 && common / Math.max(a.size, 1) >= 0.6
}

function namesOf(family) {
  return [family.nombreReferencia, ...family.integrantes.map((member) => member.nombreCompleto)].filter(Boolean)
}

export function reconcileFamilies(reference, families, knownCommunities = []) {
  const database = families.map((family) => ({ ...family,
    integrantes: family.integrantes ?? [], huertos: family.huertos ?? [],
  }))
  const communities = new Set(knownCommunities.map((name) => normalizeText(name)))
  const findings = []
  const matched = new Set()

  for (const item of reference) {
    const community = normalizeText(item.comunidad)
    const name = normalizeText(item.nombre)
    const sameCommunity = database.filter((family) => normalizeText(family.comunidad) === community)
    const exact = sameCommunity.filter((family) => namesOf(family).some((n) => normalizeText(n) === name))
    const otherCommunity = database.filter((family) => normalizeText(family.comunidad) !== community &&
      namesOf(family).some((n) => normalizeText(n) === name))
    const approximate = sameCommunity.filter((family) => !exact.includes(family) &&
      namesOf(family).some((n) => partialCandidate(item.nombre, n)))

    let status, candidates
    if (exact.length > 1) { status = 'DUPLICADO_POTENCIAL'; candidates = exact }
    else if (exact.length === 1) { status = 'COINCIDENCIA_EXACTA'; candidates = exact; matched.add(exact[0].id) }
    else if (approximate.length > 1) { status = 'AMBIGUO'; candidates = approximate }
    else if (approximate.length === 1) { status = 'REVISAR_NOMBRE'; candidates = approximate }
    else if (otherCommunity.length) { status = 'REVISAR_COMUNIDAD'; candidates = otherCommunity }
    else { status = 'SIN_COINCIDENCIA'; candidates = [] }
    findings.push({ ...item, status, candidates: candidates.map((f) => labelFamily(f)),
      comunidadRegistrada: candidates.map((f) => f.comunidad),
      comunidadDisponible: communities.has(community),
    })
  }

  const duplicateGroups = new Map()
  for (const family of database) {
    const key = `${normalizeText(family.nombreReferencia)}|${normalizeText(family.comunidad)}`
    if (!normalizeText(family.nombreReferencia)) continue
    duplicateGroups.set(key, [...(duplicateGroups.get(key) ?? []), labelFamily(family)])
  }
  const duplicates = [...duplicateGroups.values()].filter((items) => items.length > 1)
  const incomplete = database.filter((family) =>
    !normalizeText(family.nombreReferencia) || !normalizeText(family.comunidad) ||
    family.integrantes.length === 0 || !family.estado,
  ).map((family) => ({ id: family.id, nombre: family.nombreReferencia,
    problemas: [
      ...(!normalizeText(family.nombreReferencia) ? ['nombre de referencia ausente'] : []),
      ...(!normalizeText(family.comunidad) ? ['comunidad ausente'] : []),
      ...(family.integrantes.length === 0 ? ['sin integrantes'] : []),
      ...(!family.estado ? ['sin estado'] : []),
    ],
  }))
  const activeGardens = database.flatMap((family) => family.huertos.filter((garden) =>
    normalizeText(garden.estado) === 'activo',
  ))
  const noActiveGardens = database.filter((family) => !family.huertos.some((garden) =>
    normalizeText(garden.estado) === 'activo',
  )).map((family) => labelFamily(family))
  const findingsExactIds = [...matched]
  return {
    findings, duplicates, incomplete,
    unchecked: database.filter((family) => !matched.has(family.id)).map((family) => labelFamily(family)),
    summary: {
      oficiales: reference.length,
      familiasRegistradas: database.length,
      exactas: findings.filter((item) => item.status === 'COINCIDENCIA_EXACTA').length,
      pendientes: findings.filter((item) => item.status !== 'COINCIDENCIA_EXACTA').length,
      comunidadesSinCatalogo: [...new Set(findings.filter((item) => !item.comunidadDisponible).map((item) => item.comunidad))],
      huertosRegistrados: database.reduce((total, family) => total + family.huertos.length, 0),
      huertosActivos: activeGardens.length,
      familiasSinHuertoActivo: noActiveGardens,
      familiasCoincidentesIds: findingsExactIds,
    },
  }
}

function cell(value) {
  return String(value ?? '').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ').trim()
}

export function toMarkdown(result) {
  const { summary, findings, duplicates, incomplete, unchecked } = result
  const lines = [
    '# CIR-02 — Auditoría local de familias (datos sensibles)',
    '',
    'Documento de conciliación de solo lectura. NO equivale a un padrón aprobado.',
    'Mantener este archivo fuera de Git y compartirlo únicamente con personal autorizado.',
    '',
    '## Resumen',
    '',
    `- Participantes del archivo oficial: ${summary.oficiales}`,
    `- Familias en BD (incluye pruebas/inactivas): ${summary.familiasRegistradas}`,
    `- Coincidencias exactas únicas (nombre y comunidad): ${summary.exactas}`,
    `- Participantes pendientes de verificación: ${summary.pendientes}`,
    `- Huertos registrados (todos los estados): ${summary.huertosRegistrados}`,
    `- Huertos marcados ACTIVOS: ${summary.huertosActivos}`,
    '',
    '**Importante:** 18 huertos mencionados en el documento histórico no son necesariamente 18 huertos activos en la BD actual.',
    'Una coincidencia exacta por nombre/comunidad tampoco certifica la identidad sin revisión humana.',
    '',
    '## Participantes por verificar',
    '',
    '| Participante oficial | Comunidad oficial | Resultado | Candidatos en BD (solo sugerencias) |',
    '|---|---|---|---|',
    ...findings.map((item) =>
      `| ${cell(item.nombre)} | ${cell(item.comunidad)} | ${cell(item.status)}${item.comunidadDisponible ? '' : ' / COMUNIDAD_NO_CATALOGADA'} | ${cell(item.candidates.join('; ') || '—')} |`,
    ),
    '', '## Posibles duplicados por nombre de referencia y comunidad', '',
    ...(duplicates.length ? duplicates.map((items) => `- ${items.map(cell).join(' / ')}`) : ['- No detectados mediante esta regla.']),
    '', '## Familias con campos a revisar', '',
    ...(incomplete.length ? incomplete.map((item) => `- #${item.id} ${cell(item.nombre)}: ${item.problemas.join(', ')}`) : ['- No detectadas mediante esta regla.']),
    '', '## Familias no conciliadas por coincidencia exacta', '',
    ...(unchecked.length ? unchecked.map((item) => `- ${cell(item)}`) : ['- Ninguna.']),
    '', '## Familias sin huerto marcado ACTIVO', '',
    ...(summary.familiasSinHuertoActivo.length ? summary.familiasSinHuertoActivo.map((item) => `- ${cell(item)}`) : ['- Ninguna.']),
    '', '## Decisiones para revisión institucional', '',
    '- Confirmar coincidencias parciales, alias y nombres abreviados con la fuente original.',
    '- Confirmar comunidades no registradas o con nomenclaturas diferentes.',
    '- Confirmar por qué la referencia histórica habla de 18 huertos y el padrón enumera 19 participantes.',
    '- Clasificar familias de prueba, antiguas, inactivas o pertenecientes a otros programas antes de comparar totales.',
    '- Registrar cualquier corrección posterior con responsable, fecha y evidencia; nunca ejecutar fusiones automáticas.',
    '',
  ]
  return lines.join('\n')
}
