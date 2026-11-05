// CIR-02: planificación de carga sin conexión a la BD; no incluye el padrón real.
import { createHash } from 'node:crypto'
import { normalizeText, reconcileFamilies } from './cir-02-audit-lib.mjs'

export const MUNICIPIO_OBJETIVO = 'Santa Lucía Utatlán'
export const COMUNIDADES_OBJETIVO = ["Paxub’", 'Los Planes', 'Barrio La Esperanza', 'Payajut', 'Ciénaga Grande']
const canonical = (value) => normalizeText(value)
const keyFor = (item) => `${canonical(item.nombre)}|${canonical(item.comunidad)}`

export function checksum(value) {
  return createHash('sha256').update(value).digest('hex')
}

function onlyOne(items, label) {
  if (items.length > 1) throw new Error(`Catálogo ambiguo: ${label}. Se requiere corregirlo por separado.`)
  return items[0] ?? null
}

export function buildImportPlan(reference, snapshot, sourceSha256) {
  if (reference.length !== 19) throw new Error('El padrón debe contener 19 participantes.')
  const recognized = new Set(COMUNIDADES_OBJETIVO.map(canonical))
  if (new Set(reference.map((row) => canonical(row.comunidad))).size !== 5 ||
      reference.some((row) => !recognized.has(canonical(row.comunidad)))) {
    throw new Error('El padrón debe contener exclusivamente las cinco comunidades institucionales.')
  }
  if (reference.some((row) => row.nombre.length > 150)) {
    throw new Error('Un nombre del padrón supera el máximo de 150 caracteres admitido en familia.')
  }
  const municipality = onlyOne(snapshot.municipalities.filter((m) => canonical(m.nombre) === canonical(MUNICIPIO_OBJETIVO)), 'municipio objetivo')
  if (municipality && !municipality.activo) throw new Error('El municipio objetivo existe pero está inactivo; revisar manualmente.')
  const communities = COMUNIDADES_OBJETIVO.map((nombre) => {
    const matches = snapshot.communities.filter((c) =>
      (!municipality || c.municipioId === municipality.id) && canonical(c.nombre) === canonical(nombre))
    const present = municipality ? onlyOne(matches, `comunidad ${nombre}`) : null
    if (present && !present.activo) throw new Error(`La comunidad ${nombre} está inactiva; revisar manualmente.`)
    return { nombre, existenteId: present?.id ?? null }
  })
  // Las coincidencias de nombre NO certifican identidad; se requiere aprobación por fila.
  const summary = reconcileFamilies(reference, snapshot.families, snapshot.communities.map((c) => c.nombre))
  const rows = reference.map((item, index) => {
    const finding = summary.findings[index]
    const matching = snapshot.families.filter((f) =>
      (f.integrantes ?? []).some((m) => canonical(m.nombreCompleto) === canonical(item.nombre)) ||
      canonical(f.nombreReferencia) === canonical(item.nombre))
    const mismatchedLocation = matching.some((f) =>
      canonical(f.comunidad) !== canonical(item.comunidad) || !municipality || f.municipioId !== municipality.id)
    const action = finding.status === 'COINCIDENCIA_EXACTA' && !mismatchedLocation
      ? 'EXISTE' : finding.status === 'SIN_COINCIDENCIA' && !mismatchedLocation ? 'CREAR' : 'REVISAR'
    return { fila: index + 2, nombre: item.nombre, comunidad: item.comunidad,
      accionPropuesta: action, estadoAuditoria: finding.status, candidatos: finding.candidates,
      ...(mismatchedLocation ? { observacion: 'El nombre también figura en otra comunidad o municipio.' } : {}),
    }
  })
  const plan = {
    version: 1, municipio: MUNICIPIO_OBJETIVO, comunidades: communities, sourceSha256,
    snapshotSha256: checksum(JSON.stringify(snapshot)), filas: rows,
    resumen: {
      participantes: rows.length,
      crear: rows.filter((r) => r.accionPropuesta === 'CREAR').length,
      existentes: rows.filter((r) => r.accionPropuesta === 'EXISTE').length,
      revisar: rows.filter((r) => r.accionPropuesta === 'REVISAR').length,
      comunidadesNuevas: communities.filter((c) => !c.existenteId).length,
      municipioNuevo: !municipality,
    },
  }
  plan.codigoRevision = checksum(JSON.stringify(plan)).slice(0, 16).toUpperCase()
  return plan
}

export function makeReview(plan) {
  return {
    codigoRevision: plan.codigoRevision,
    responsable: '', fechaValidacion: '', aprobacionInstitucional: false,
    observacionesRevision: 'Verificar identidad, municipio, comunidades y diferencias del padrón original.',
    decisiones: plan.filas.map((r) => ({ fila: r.fila, nombre: r.nombre,
      comunidad: r.comunidad, decision: '', estadoFamilia: '',
    })),
  }
}

function isValidDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value
}

export function validateReview(plan, review) {
  if (!review || review.codigoRevision !== plan.codigoRevision) throw new Error('La revisión corresponde a otro plan. Repetir simulación y revisión.')
  if (review.aprobacionInstitucional !== true || typeof review.responsable !== 'string' ||
      review.responsable.trim().length < 3 || !isValidDate(review.fechaValidacion)) {
    throw new Error('Se requiere aprobación institucional explícita, responsable y fecha válida en revision-importacion.json.')
  }
  if (!Array.isArray(review.decisiones) || review.decisiones.length !== plan.filas.length) {
    throw new Error('Faltan decisiones individuales del padrón.')
  }
  const verified = new Set()
  for (let index = 0; index < plan.filas.length; index++) {
    const original = plan.filas[index], decision = review.decisiones[index]
    if (decision?.fila !== original.fila || keyFor(decision) !== keyFor(original)) {
      throw new Error(`La fila ${original.fila} de la revisión no coincide con el padrón.`)
    }
    if (verified.has(decision.fila)) throw new Error('La revisión contiene filas repetidas.')
    verified.add(decision.fila)
    if (original.accionPropuesta === 'REVISAR') {
      throw new Error(`La fila ${original.fila} requiere conciliación manual antes de la importación.`)
    }
    if (decision.decision !== original.accionPropuesta) {
      throw new Error(`La fila ${original.fila} debe aprobarse como ${original.accionPropuesta}; no se permite reasignar automáticamente.`)
    }
    if (decision.decision === 'CREAR' && !['ACTIVA', 'PENDIENTE_VALIDACION'].includes(decision.estadoFamilia)) {
      throw new Error(`La fila ${original.fila} requiere estadoFamilia ACTIVA o PENDIENTE_VALIDACION.`)
    }
    if (decision.decision === 'EXISTE' && decision.estadoFamilia !== '') {
      throw new Error(`La fila ${original.fila} ya existe; no se puede cambiar el estado mediante esta importación.`)
    }
  }
  return true
}
